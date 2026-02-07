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
        // Ignore bot messages
        if (message.author.bot) return;

        // Check if message is from a monitored channel
        if (!this.channelIds.includes(message.channel.id)) return;

        console.log(`[DiscordBot] New message in monitored channel: ${message.id}`);

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

        // Store in database
        await db.run(`
            INSERT INTO discord_logs (
                discord_message_id, channel_id, raw_content, parsed_type,
                employee_name, customer_name, amount, reason,
                log_timestamp, match_status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
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
            'pending'
        );

        console.log(`[DiscordBot] Stored log: ${parsedData.type} - ${parsedData.amount}$ by ${parsedData.employee}`);

        // Get the inserted log with its ID
        const insertedLog = await db.get(
            'SELECT * FROM discord_logs WHERE discord_message_id = ?',
            message.id
        );

        // Broadcast to frontend clients for confirmation popup
        if (insertedLog) {
            broadcastDiscordLog(insertedLog);
            console.log(`[DiscordBot] Broadcasted log ${insertedLog.id} to clients`);
        }

        // Don't trigger automatic matching - wait for user confirmation
        // await this.triggerMatching(message.id);
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

export default DiscordBotService;
