/**
 * Discord Bot Service for FiveM Log Monitoring
 * Reads messages from configured channels and forwards them for processing
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { parseLogWithAI, validateParsedLog } from './geminiParser.js';
import { getDb } from '../db/database.js';
import { broadcastDiscordLog } from './broadcaster.js';

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

        this.client.once('ready', () => {
            console.log(`[DiscordBot] Logged in as ${this.client.user.tag}`);
            console.log(`[DiscordBot] Monitoring channels: ${this.channelIds.join(', ')}`);
            this.isRunning = true;
        });

        this.client.on('messageCreate', async (message) => {
            await this.handleMessage(message);
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

        // Check if already processed
        const db = await getDb();
        const existing = await db.get(
            'SELECT id FROM discord_logs WHERE discord_message_id = ?',
            message.id
        );

        if (existing) {
            console.log(`[DiscordBot] Message ${message.id} already processed`);
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
        let matchingLog = null;

        if (referenceId && insertedLog) {
            try {
                const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
                matchingLog = await db.get(
                    `SELECT timestamp, type, itemName, quantity, depositor, price, category FROM logs 
                     WHERE transaction_id = ? AND timestamp >= ? LIMIT 1`,
                    referenceId, fourteenDaysAgo
                );
                if (matchingLog) {
                    await db.run(
                        `UPDATE discord_logs SET matched_log_id = ?, match_status = 'matched', 
                         discrepancy_details = ? WHERE id = ?`,
                        matchingLog.timestamp,
                        JSON.stringify({
                            method: 'auto_reference_id',
                            referenceId,
                            matchedAt: new Date().toISOString()
                        }),
                        insertedLog.id
                    );
                    autoMatched = true;
                    console.log(`[DuplicateCheck] ✓ Auto-matched Discord log #${insertedLog.id} → System log ${matchingLog.timestamp} via Ref-ID ${referenceId}`);
                }
            } catch (dupErr) {
                console.error('[DuplicateCheck] Error:', dupErr);
            }
        }

        // === Send Reply Message in Discord ===
        try {
            const replyContent = autoMatched && matchingLog
                ? this.buildMatchedReply(referenceId, matchingLog, parsedData)
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

        // Only broadcast for manual confirmation if NOT auto-matched
        if (insertedLog && !autoMatched) {
            broadcastDiscordLog(insertedLog);
            console.log(`[DiscordBot] Broadcasted log ${insertedLog.id} to clients for confirmation`);
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
     * Build reply content for a matched transaction
     */
    buildMatchedReply(referenceId, systemLog, parsedData) {
        const total = (systemLog.quantity || 0) * (systemLog.price || 0);
        const typeLabel = systemLog.type === 'in' ? '📥 Einkauf' : '📤 Verkauf';
        const discordTotal = parsedData.amount || 0;
        const diff = Math.abs(total - discordTotal);

        let msg = `✅ **MET Buchung gefunden** — Ref: \`${referenceId}\`\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `${typeLabel}\n`;
        msg += `📦 **Produkt:** ${systemLog.itemName}\n`;
        msg += `🔢 **Menge:** ${systemLog.quantity}x\n`;
        msg += `💰 **Stückpreis:** $${Number(systemLog.price).toLocaleString('de-DE')}\n`;
        msg += `💵 **Gesamt:** $${Number(total).toLocaleString('de-DE')}\n`;
        msg += `👤 **Mitarbeiter:** ${systemLog.depositor}\n`;

        if (diff > 1) {
            msg += `\n⚠️ **Differenz:** Discord $${Number(discordTotal).toLocaleString('de-DE')} vs System $${Number(total).toLocaleString('de-DE')} (Δ $${Number(diff).toLocaleString('de-DE')})`;
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

        // Auto-match the discord log
        await db.run(
            `UPDATE discord_logs SET matched_log_id = ?, match_status = 'matched',
             discrepancy_details = ? WHERE id = ?`,
            systemLog.timestamp,
            JSON.stringify({
                method: 'auto_reference_id_from_system',
                referenceId: transactionId,
                matchedAt: new Date().toISOString()
            }),
            discordLog.id
        );
        console.log(`[RefMatch] ✓ System tx ${transactionId} → Discord log #${discordLog.id}`);

        // Edit the bot's pending reply if it exists
        if (discordLog.bot_reply_id && discordLog.channel_id) {
            const parsedData = {
                type: discordLog.parsed_type,
                amount: discordLog.amount,
                employee: discordLog.employee_name,
                reason: discordLog.reason
            };
            const updatedContent = bot.buildMatchedReply(transactionId, systemLog, parsedData);
            await bot.editReplyMessage(discordLog.channel_id, discordLog.bot_reply_id, updatedContent);
        }

        return true;
    } catch (err) {
        console.error('[RefMatch] Error updating reply:', err);
        return false;
    }
}

export default DiscordBotService;
