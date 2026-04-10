/**
 * Discord Bot Service for FiveM Log Monitoring
 * Reads messages from configured channels and forwards them for processing
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { parseLogWithAI, validateParsedLog } from './geminiParser.js';
import { getDb } from '../db/database.js';
import { broadcastDiscordLog } from './broadcaster.js';
import { registerCommands, handleAuftragCommand, handleAuftragButton } from './auftragService.js';

class DiscordBotService {
    constructor() {
        this.client = null;
        this.channelIds = [];
        this.isRunning = false;
        this.messageQueue = [];
        this.processingQueue = false;
    }

    /**
     * Initialize and start the Discord Bot
     */
    async start() {
        if (this.isRunning) {
            console.log('[DiscordBot] Bot is already running');
            return;
        }

        const token = process.env.DISCORD_BOT_TOKEN;
        const channelIdsStr = process.env.DISCORD_LOG_CHANNEL_IDS || '';

        if (!token) {
            console.error('[DiscordBot] DISCORD_BOT_TOKEN is not set');
            return;
        }

        this.channelIds = channelIdsStr.split(',').map(id => id.trim()).filter(Boolean);

        if (this.channelIds.length === 0) {
            console.error('[DiscordBot] DISCORD_LOG_CHANNEL_IDS is not set');
            return;
        }

        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ],
            partials: [Partials.Message, Partials.Channel]
        });

        this.client.once('ready', async () => {
            console.log(`[DiscordBot] Logged in as ${this.client.user.tag}`);
            console.log(`[DiscordBot] Monitoring channels: ${this.channelIds.join(', ')}`);
            this.isRunning = true;

            // Register slash commands for Auftragssystem
            try {
                await registerCommands(this.client);
            } catch (err) {
                console.error('[DiscordBot] Failed to register slash commands:', err);
            }
        });

        this.client.on('messageCreate', async (message) => {
            await this.handleMessage(message);
        });

        // Handle slash commands and button interactions (Auftragssystem)
        this.client.on('interactionCreate', async (interaction) => {
            try {
                if (interaction.isChatInputCommand()) {
                    if (interaction.commandName === 'auftrag') {
                        await handleAuftragCommand(interaction);
                    }
                } else if (interaction.isButton()) {
                    await handleAuftragButton(interaction);
                }
            } catch (error) {
                console.error('[DiscordBot] Interaction error:', error);
                const reply = { content: '❌ Ein Fehler ist aufgetreten.', flags: 64 };
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply).catch(() => {});
                } else {
                    await interaction.reply(reply).catch(() => {});
                }
            }
        });

        this.client.on('error', (error) => {
            console.error('[DiscordBot] Client error:', error);
        });

        try {
            await this.client.login(token);
        } catch (error) {
            console.error('[DiscordBot] Failed to login:', error);
        }
    }

    /**
     * Handle incoming Discord messages
     */
    async handleMessage(message) {
        // Allow bot messages (Bossmenü Logs etc.) - only skip own messages
        if (message.author.id === this.client?.user?.id) return;

        // Check if message is from a monitored channel
        if (!this.channelIds.includes(message.channel.id)) return;

        console.log(`[DiscordBot] New message in monitored channel: ${message.id} (author: ${message.author.tag}, bot: ${message.author.bot})`);

        // Add to queue for processing
        this.messageQueue.push({
            id: message.id,
            channelId: message.channel.id,
            content: message.content,
            embeds: message.embeds,
            timestamp: message.createdAt
        });

        // Process queue
        this.processQueue();
    }

    /**
     * Process the message queue
     */
    async processQueue() {
        if (this.processingQueue || this.messageQueue.length === 0) return;

        this.processingQueue = true;

        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            try {
                await this.processMessage(message);
            } catch (error) {
                console.error('[DiscordBot] Error processing message:', error);
            }
        }

        this.processingQueue = false;
    }

    /**
     * Process a single message
     */
    async processMessage(message) {
        // Combine content and embed text
        let fullContent = message.content || '';

        if (message.embeds && message.embeds.length > 0) {
            for (const embed of message.embeds) {
                if (embed.title) fullContent += '\n' + embed.title;
                if (embed.description) fullContent += '\n' + embed.description;
                if (embed.fields) {
                    for (const field of embed.fields) {
                        fullContent += `\n${field.name}: ${field.value}`;
                    }
                }
            }
        }

        if (!fullContent.trim()) {
            console.log('[DiscordBot] Skipping empty message');
            return;
        }

        // Check if already processed (by message ID)
        const db = await getDb();
        const existing = await db.get(
            'SELECT id FROM discord_logs WHERE discord_message_id = ?',
            message.id
        );

        if (existing) {
            console.log(`[DiscordBot] Message ${message.id} already processed`);
            return;
        }

        // Skip if this looks like our own bot reply
        if (fullContent.includes('**MET Buchung gefunden**') || fullContent.includes('**Warte auf MET Buchung**')) {
            console.log(`[DiscordBot] Skipping own bot reply`);
            return;
        }

        // Final Filter: Only process messages related to trade (Einkauf/Verkauf)
        const tradeKeywords = ['AK', 'VK', 'ANKAUF', 'VERKAUF', 'AN- UND VERKAUF'];
        const contentUpper = fullContent.toUpperCase();
        const isTradeMessage = tradeKeywords.some(kw => contentUpper.includes(kw));

        if (!isTradeMessage) {
            console.log('[DiscordBot] Skipping unrelated message (not AK/VK/Ankauf/Verkauf)');
            return;
        }

        // Parse with Gemini AI
        console.log('[DiscordBot] Parsing message with Gemini AI...');
        const parsedData = await parseLogWithAI(fullContent);
        const validation = validateParsedLog(parsedData);

        if (!validation.isValid) {
            console.log(`[DiscordBot] Invalid log format, missing: ${validation.missing.join(', ')}`);
        }

        // Extract reference_id - from AI result or from reason
        let referenceId = parsedData.reference_id || null;
        if (!referenceId && parsedData.reason) {
            const refMatch = parsedData.reason.match(/\b([A-Z0-9]{4,8})$/i);
            if (refMatch) referenceId = refMatch[1].toUpperCase();
        }

        // Dedup by reference_id — Bossmenü Logs sends content + embed as 2 separate messages
        if (referenceId) {
            const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            const refDupe = await db.get(
                'SELECT id FROM discord_logs WHERE reference_id = ? AND created_at >= ?',
                referenceId, twoMinAgo
            );
            if (refDupe) {
                console.log(`[DiscordBot] Ref-ID ${referenceId} already processed recently (log #${refDupe.id}), skipping`);
                return;
            }
        }

        // Store in database
        await db.run(`
            INSERT INTO discord_logs (
                discord_message_id, channel_id, raw_content, parsed_type,
                employee_name, customer_name, amount, reason,
                log_timestamp, match_status, reference_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `,
            message.id,
            message.channelId,
            fullContent,
            parsedData.type,
            parsedData.employee,
            parsedData.customer,
            parsedData.amount,
            parsedData.reason,
            parsedData.timestamp || message.timestamp?.toISOString(),
            'pending',
            referenceId
        );

        console.log(`[DiscordBot] Stored log: ${parsedData.type} - ${parsedData.amount}$ by ${parsedData.employee}${referenceId ? ` (Ref: ${referenceId})` : ''}`);

        const insertedLog = await db.get(
            'SELECT * FROM discord_logs WHERE discord_message_id = ?',
            message.id
        );

        // === Referenz-ID Auto-Match + Reply ===
        let autoMatched = false;
        let matchingLogs = [];

        if (referenceId && insertedLog) {
            try {
                const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
                matchingLogs = await db.all(
                    `SELECT timestamp, type, itemName, quantity, depositor, price, category FROM logs 
                     WHERE transaction_id = ? AND timestamp >= ?`,
                    referenceId, fourteenDaysAgo
                );
                if (matchingLogs.length > 0) {
                    await db.run(
                        `UPDATE discord_logs SET matched_log_id = ?, match_status = 'matched', 
                         discrepancy_details = ? WHERE id = ?`,
                        matchingLogs[0].timestamp,
                        JSON.stringify({
                            method: 'auto_reference_id',
                            referenceId,
                            matchedAt: new Date().toISOString()
                        }),
                        insertedLog.id
                    );
                    autoMatched = true;
                    console.log(`[DuplicateCheck] ✓ Auto-matched Discord log #${insertedLog.id} → ${matchingLogs.length} system log(s) via Ref-ID ${referenceId}`);
                }
            } catch (dupErr) {
                console.error('[DuplicateCheck] Error:', dupErr);
            }
        }

        // === Send Reply Message in Discord ===
        try {
            const replyContent = autoMatched && matchingLogs.length > 0
                ? this.buildMatchedReply(referenceId, matchingLogs, parsedData)
                : this.buildPendingReply(referenceId, parsedData);

            const replyMsg = await this.sendReplyMessage(message.channelId, message.id, replyContent);

            if (replyMsg) {
                await db.run(
                    'UPDATE discord_logs SET bot_reply_id = ? WHERE id = ?',
                    replyMsg.id, insertedLog.id
                );
                console.log(`[DiscordBot] Reply sent: ${replyMsg.id}`);
            }
        } catch (replyErr) {
            console.error('[DiscordBot] Error sending reply:', replyErr);
        }

        // Fully automatic — no manual confirmation popup
        if (!autoMatched && referenceId) {
            console.log(`[DiscordBot] Log #${insertedLog?.id} pending — will auto-match when system transaction arrives`);
        }
    }

    /**
     * Send a reply to a Discord message
     */
    async sendReplyMessage(channelId, originalMessageId, content) {
        if (!this.client || !this.isRunning) return null;

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) return null;

            const originalMessage = await channel.messages.fetch(originalMessageId);
            if (originalMessage) {
                return await originalMessage.reply(content);
            } else {
                return await channel.send(content);
            }
        } catch (err) {
            console.error('[DiscordBot] Failed to send reply:', err.message);
            return null;
        }
    }

    /**
     * Edit an existing bot reply message with updated content
     */
    async editReplyMessage(channelId, replyMessageId, newContent) {
        if (!this.client || !this.isRunning) return false;

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) return false;

            const replyMsg = await channel.messages.fetch(replyMessageId);
            if (replyMsg && replyMsg.author.id === this.client.user.id) {
                await replyMsg.edit(newContent);
                console.log(`[DiscordBot] Updated reply message ${replyMessageId}`);
                return true;
            }
        } catch (err) {
            console.error('[DiscordBot] Failed to edit reply:', err.message);
        }
        return false;
    }

    /**
     * Build reply content for a matched transaction (supports multiple products)
     */
    buildMatchedReply(referenceId, systemLogs, parsedData) {
        // Accept both single log and array for backwards compat
        const logs = Array.isArray(systemLogs) ? systemLogs : [systemLogs];
        const grandTotal = logs.reduce((sum, l) => sum + ((l.quantity || 0) * (l.price || 0)), 0);
        const typeLabel = logs[0].type === 'in' ? '📥 Einkauf' : '📤 Verkauf';
        const discordTotal = parsedData.amount || 0;
        const diff = Math.abs(grandTotal - discordTotal);

        let msg = `✅ **MET Buchung gefunden** — Ref: \`${referenceId}\`\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `${typeLabel}\n`;

        for (const log of logs) {
            const lineTotal = (log.quantity || 0) * (log.price || 0);
            msg += `📦 ${log.itemName} — ${log.quantity}x à $${Number(log.price).toLocaleString('de-DE')} = $${Number(lineTotal).toLocaleString('de-DE')}\n`;
        }

        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `💵 **Gesamt:** $${Number(grandTotal).toLocaleString('de-DE')}\n`;
        msg += `👤 **Mitarbeiter:** ${logs[0].depositor}\n`;

        if (diff > 1) {
            msg += `\n⚠️ **Differenz:** Discord $${Number(discordTotal).toLocaleString('de-DE')} vs System $${Number(grandTotal).toLocaleString('de-DE')} (Δ $${Number(diff).toLocaleString('de-DE')})`;
        }

        return msg;
    }

    /**
     * Build reply content for a pending (unmatched) transaction
     */
    buildPendingReply(referenceId, parsedData) {
        const typeLabel = parsedData.type === 'abhebung' ? '📥 Einkauf' : '📤 Verkauf';

        let msg = `⏳ **Warte auf MET Buchung**`;
        if (referenceId) msg += ` — Ref: \`${referenceId}\``;
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `${typeLabel}\n`;
        msg += `💵 **Discord Betrag:** $${Number(parsedData.amount || 0).toLocaleString('de-DE')}\n`;
        msg += `👤 **Mitarbeiter:** ${parsedData.employee || 'Unbekannt'}\n`;
        msg += `📝 **Grund:** ${parsedData.reason || '-'}\n`;
        msg += `\n_Wird automatisch aktualisiert sobald die Buchung im System eingeht._`;

        return msg;
    }

    /**
     * Trigger the log matching process for a Discord log
     */
    async triggerMatching(discordMessageId) {
        try {
            const { matchDiscordLog } = await import('./logMatcher.js');
            await matchDiscordLog(discordMessageId);
        } catch (error) {
            console.error('[DiscordBot] Error during matching:', error);
        }
    }

    /**
     * Fetch historical messages from a channel
     */
    async fetchHistoricalMessages(channelId, limit = 100) {
        if (!this.client || !this.isRunning) {
            console.error('[DiscordBot] Bot is not running');
            return [];
        }

        try {
            const channel = await this.client.channels.fetch(channelId);
            if (!channel) {
                console.error(`[DiscordBot] Channel ${channelId} not found`);
                return [];
            }

            const messages = await channel.messages.fetch({ limit });
            const processedMessages = [];

            for (const [, message] of messages) {
                const messageData = {
                    id: message.id,
                    channelId: message.channel.id,
                    content: message.content,
                    embeds: message.embeds.map(e => ({
                        title: e.title,
                        description: e.description,
                        fields: e.fields
                    })),
                    timestamp: message.createdAt
                };

                processedMessages.push(messageData);
                await this.processMessage(messageData);
            }

            return processedMessages;
        } catch (error) {
            console.error('[DiscordBot] Error fetching historical messages:', error);
            return [];
        }
    }

    /**
     * Stop the Discord Bot
     */
    async stop() {
        if (this.client) {
            await this.client.destroy();
            this.client = null;
            this.isRunning = false;
            console.log('[DiscordBot] Bot stopped');
        }
    }

    /**
     * Get bot status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            channelIds: this.channelIds,
            queueLength: this.messageQueue.length,
            username: this.client?.user?.tag || null
        };
    }
}

// Singleton instance
let botInstance = null;

export function getDiscordBot() {
    if (!botInstance) {
        botInstance = new DiscordBotService();
    }
    return botInstance;
}

/**
 * Called from transactionRoutes.js when a system transaction is created
 * that matches a pending Discord log by reference ID.
 * Updates the bot's reply message from "pending" to "matched" with product details.
 */
export async function updateReplyForTransaction(transactionId, systemLog) {
    const db = await getDb();
    const bot = getDiscordBot();

    try {
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const discordLog = await db.get(
            `SELECT id, channel_id, bot_reply_id, amount, reason, employee_name, parsed_type 
             FROM discord_logs 
             WHERE reference_id = ? AND created_at >= ? AND match_status = 'pending' 
             LIMIT 1`,
            transactionId.toUpperCase(), fourteenDaysAgo
        );

        if (!discordLog) return false;

        // Load ALL system logs with the same transaction_id (multi-product cart)
        const allSystemLogs = await db.all(
            `SELECT timestamp, type, itemName, quantity, depositor, price, category FROM logs
             WHERE transaction_id = ? AND timestamp >= ?`,
            transactionId.toUpperCase(), fourteenDaysAgo
        );
        const logsToUse = allSystemLogs.length > 0 ? allSystemLogs : [systemLog];

        // Auto-match the discord log
        await db.run(
            `UPDATE discord_logs SET matched_log_id = ?, match_status = 'matched',
             discrepancy_details = ? WHERE id = ?`,
            logsToUse[0].timestamp,
            JSON.stringify({
                method: 'auto_reference_id_from_system',
                referenceId: transactionId,
                matchedAt: new Date().toISOString()
            }),
            discordLog.id
        );
        console.log(`[RefMatch] ✓ System tx ${transactionId} → Discord log #${discordLog.id} (${logsToUse.length} product(s))`);

        // Edit the bot's pending reply if it exists
        if (discordLog.bot_reply_id && discordLog.channel_id) {
            const parsedData = {
                type: discordLog.parsed_type,
                amount: discordLog.amount,
                employee: discordLog.employee_name,
                reason: discordLog.reason
            };
            const updatedContent = bot.buildMatchedReply(transactionId, logsToUse, parsedData);
            await bot.editReplyMessage(discordLog.channel_id, discordLog.bot_reply_id, updatedContent);
        }

        return true;
    } catch (err) {
        console.error('[RefMatch] Error updating reply:', err);
        return false;
    }
}

export default DiscordBotService;
