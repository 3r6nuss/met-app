/**
 * Discord Bot Service for FiveM Log Monitoring
 * Reads messages from configured channels and forwards them for processing
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { parseLogWithAI, validateParsedLog, extractReferenceId } from './geminiParser.js';
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
        // In-memory cache of recently processed content hashes for fast dedup
        this.recentContentHashes = []; // { hash, timestamp, referenceId }
    }

    /**
     * Normalize message content for dedup comparison.
     * Strips formatting, emojis, whitespace, and lowercases everything.
     */
    normalizeContent(text) {
        return text
            .replace(/[\r\n]+/g, ' ')          // newlines → space
            .replace(/\*\*|__|~~|`/g, '')       // markdown formatting
            .replace(/[^\w\s$.,äöüÄÖÜß]/g, '') // remove emojis/special chars
            .replace(/\s+/g, ' ')               // collapse whitespace
            .trim()
            .toLowerCase();
    }

    /**
     * Calculate similarity between two strings (0-1).
     * Uses a fast character-overlap approach + key data extraction.
     */
    contentSimilarity(a, b) {
        if (!a || !b) return 0;
        const na = this.normalizeContent(a);
        const nb = this.normalizeContent(b);
        if (na === nb) return 1;

        // Jaccard similarity on word sets
        const wordsA = new Set(na.split(' ').filter(w => w.length > 1));
        const wordsB = new Set(nb.split(' ').filter(w => w.length > 1));
        if (wordsA.size === 0 && wordsB.size === 0) return 1;

        let intersection = 0;
        for (const w of wordsA) {
            if (wordsB.has(w)) intersection++;
        }
        const union = new Set([...wordsA, ...wordsB]).size;
        return union === 0 ? 0 : intersection / union;
    }

    /**
     * Check if this content was already processed recently (within 5 min).
     * Returns true if a similar message was found.
     */
    isDuplicateContent(content) {
        const now = Date.now();
        const FIVE_MIN = 5 * 60 * 1000;
        const SIMILARITY_THRESHOLD = 0.80;

        // Prune old entries
        this.recentContentHashes = this.recentContentHashes.filter(
            entry => (now - entry.timestamp) < FIVE_MIN
        );

        // Check similarity against recent entries
        for (const entry of this.recentContentHashes) {
            const sim = this.contentSimilarity(content, entry.content);
            if (sim >= SIMILARITY_THRESHOLD) {
                console.log(`[Dedup] Content similarity ${(sim * 100).toFixed(0)}% → duplicate of recent message, skipping`);
                return true;
            }
        }

        return false;
    }

    /**
     * Register processed content for dedup tracking
     */
    registerProcessedContent(content, referenceId) {
        this.recentContentHashes.push({
            content,
            referenceId,
            timestamp: Date.now()
        });
        // Keep max 50 entries
        if (this.recentContentHashes.length > 50) {
            this.recentContentHashes.shift();
        }
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
                const reply = { content: '❌ Ein Fehler ist aufgetreten.', ephemeral: true };
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
                if (embed.title) fullContent += (fullContent ? '\n' : '') + embed.title;
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

        // Skip own bot replies and MET system messages
        const botReplyPatterns = [
            '**MET Buchung gefunden**',
            '**Warte auf MET Buchung**',
            '━━━━━━━━━━',
            'Wird automatisch aktualisiert'
        ];
        if (botReplyPatterns.some(pattern => fullContent.includes(pattern))) {
            console.log(`[DiscordBot] Skipping bot/system reply`);
            return;
        }

        // ── Content Similarity Dedup ──
        // The Bossmenü sends the same transaction as 2 separate messages
        // (text content + embed). Catch the duplicate via content similarity.
        if (this.isDuplicateContent(fullContent)) {
            return; // Already logged inside isDuplicateContent
        }

        // Filter: Only process messages related to trade (Einkauf/Verkauf)
        const tradeKeywords = ['AK', 'VK', 'ANKAUF', 'VERKAUF', 'AN- UND VERKAUF',
                               'ABGEHOBEN', 'RECHNUNG', 'ABHEBUNG', 'EINGEZAHLT'];
        const contentUpper = fullContent.toUpperCase();
        const isTradeMessage = tradeKeywords.some(kw => contentUpper.includes(kw));

        if (!isTradeMessage) {
            console.log('[DiscordBot] Skipping unrelated message (no trade keywords found)');
            return;
        }

        // Parse message (regex primary → Gemini AI fallback)
        console.log('[DiscordBot] Parsing message...');
        const parsedData = await parseLogWithAI(fullContent);
        const validation = validateParsedLog(parsedData);

        if (!validation.isValid) {
            console.log(`[DiscordBot] Invalid log format, missing: ${validation.missing.join(', ')}`);
        }

        // Extract reference_id — parser already handles this, but double-check
        let referenceId = parsedData.reference_id || null;
        if (!referenceId && parsedData.reason) {
            referenceId = extractReferenceId(parsedData.reason);
        }

        // ── Reference-ID Dedup (DB-level) ──
        // Catches duplicates even across server restarts
        if (referenceId) {
            const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const refDupe = await db.get(
                'SELECT id FROM discord_logs WHERE reference_id = ? AND created_at >= ?',
                referenceId, fiveMinAgo
            );
            if (refDupe) {
                console.log(`[Dedup] Ref-ID ${referenceId} already processed recently (log #${refDupe.id}), skipping`);
                return;
            }
        }

        // Register this content for in-memory dedup tracking
        this.registerProcessedContent(fullContent, referenceId);

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
        
        // Use parsed trade_action/category if available, fallback to basic labels
        const actionLabel = parsedData.trade_action === 'ankauf' ? 'Ankauf' : (parsedData.trade_action === 'verkauf' ? 'Verkauf' : (logs[0].type === 'in' ? 'Einkauf' : 'Verkauf'));
        const typeEmoji = logs[0].type === 'in' ? '📥' : '📤';
        const categorySuffix = parsedData.category_desc ? ` — ${parsedData.category_desc}` : '';
        
        const discordTotal = parsedData.amount || 0;
        const diff = Math.abs(grandTotal - discordTotal);

        let msg = `✅ **MET Buchung gefunden** — Ref: \`${referenceId}\`\n`;
        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `${typeEmoji} **${actionLabel}${categorySuffix}**\n`;

        for (const log of logs) {
            const lineTotal = (log.quantity || 0) * (log.price || 0);
            msg += `📦 ${log.itemName} — ${log.quantity}x à $${Number(log.price).toLocaleString('de-DE')} = $${Number(lineTotal).toLocaleString('de-DE')}\n`;
        }

        msg += `━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `💵 **Gesamt:** $${Number(grandTotal).toLocaleString('de-DE')}\n`;
        
        if (parsedData.trade_action === 'verkauf' || parsedData.type === 'rechnung') {
            msg += `👤 **Verkäufer:** ${parsedData.employee || logs[0].depositor}\n`;
            if (parsedData.customer) msg += `🧑 **Kunde:** ${parsedData.customer}\n`;
        } else {
            msg += `👤 **Mitarbeiter:** ${parsedData.employee || logs[0].depositor}\n`;
        }

        if (diff > 1) {
            msg += `\n⚠️ **Differenz:** Discord $${Number(discordTotal).toLocaleString('de-DE')} vs System $${Number(grandTotal).toLocaleString('de-DE')} (Δ $${Number(diff).toLocaleString('de-DE')})`;
        }

        return msg;
    }

    /**
     * Build reply content for a pending (unmatched) transaction
     */
    buildPendingReply(referenceId, parsedData) {
        const actionLabel = parsedData.trade_action === 'ankauf' ? 'Ankauf' : (parsedData.trade_action === 'verkauf' ? 'Verkauf' : (parsedData.type === 'abhebung' ? 'Einkauf' : 'Verkauf'));
        const typeEmoji = (parsedData.trade_action === 'ankauf' || parsedData.type === 'abhebung') ? '📥' : '📤';
        const categorySuffix = parsedData.category_desc ? ` — ${parsedData.category_desc}` : '';

        let msg = `⏳ **Warte auf MET Buchung**`;
        if (referenceId) msg += ` — Ref: \`${referenceId}\``;
        msg += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        msg += `${typeEmoji} **${actionLabel}${categorySuffix}**\n`;
        msg += `💵 **Betrag:** $${Number(parsedData.amount || 0).toLocaleString('de-DE')}\n`;
        
        if (parsedData.type === 'rechnung' || parsedData.trade_action === 'verkauf') {
            msg += `👤 **Verkäufer:** ${parsedData.employee || 'Unbekannt'}\n`;
            if (parsedData.customer) msg += `🧑 **Kunde:** ${parsedData.customer}\n`;
            if (parsedData.ausgestellt_date) {
                try {
                    const date = new Date(parsedData.ausgestellt_date);
                    const formattedDate = date.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    msg += `📅 **Ausgestellt:** ${formattedDate}\n`;
                } catch (e) {
                    msg += `📅 **Ausgestellt:** ${parsedData.ausgestellt_date}\n`;
                }
            }
        } else {
            msg += `👤 **Mitarbeiter:** ${parsedData.employee || 'Unbekannt'}\n`;
        }

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
            `SELECT id, channel_id, bot_reply_id, amount, reason, employee_name, customer_name, parsed_type, raw_content
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
            // Re-parse to get all detailed fields (trade_action, category_desc etc.)
            const fullParsed = await parseLogWithAI(discordLog.raw_content);
            const parsedData = {
                ...fullParsed,
                type: discordLog.parsed_type,
                amount: discordLog.amount,
                employee: discordLog.employee_name,
                customer: discordLog.customer_name,
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
