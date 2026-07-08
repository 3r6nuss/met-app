/**
 * Auftragssystem — Discord Bot Order Management
 * Slash-Command, Embeds, Button Interactions
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
    REST,
    Routes
} from 'discord.js';
import { getDb } from '../db/database.js';
import { ticketCommands } from './ticketService.js';

// ─── Config ──────────────────────────────────────────────
const AUFTRAG_CHANNEL_ID = process.env.DISCORD_AUFTRAG_CHANNEL_ID;
const ADMIN_ROLE_ID = process.env.DISCORD_ADMIN_ROLE_ID;

// ─── Slash-Command Definition ────────────────────────────
export const auftragCommand = new SlashCommandBuilder()
    .setName('auftrag')
    .setDescription('Erstelle einen neuen Auftrag')
    .addStringOption(opt =>
        opt.setName('item')
            .setDescription('Welches Item wird benötigt?')
            .setRequired(true))
    .addStringOption(opt =>
        opt.setName('menge')
            .setDescription('Wie viel wird benötigt?')
            .setRequired(true))
    .addStringOption(opt =>
        opt.setName('entlohnung')
            .setDescription('Wie wird entlohnt?')
            .setRequired(true));

// ─── Register the slash command globally ─────────────────
export async function registerCommands(client) {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
        console.log('[Auftrag] Registering /auftrag slash command...');
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: [auftragCommand.toJSON(), ...ticketCommands.map(c => c.toJSON())] }
        );
        console.log('[Auftrag] ✓ Slash commands registered (/auftrag, /ticket-panel)');
    } catch (error) {
        console.error('[Auftrag] Failed to register slash command:', error);
    }
}

// ─── Embed Builder ───────────────────────────────────────
function buildAuftragEmbed(auftrag) {
    const statusMap = {
        offen: { emoji: '🟢', label: 'Offen', color: 0x57F287 },
        in_bearbeitung: { emoji: '🟡', label: 'In Bearbeitung', color: 0xFEE75C },
        erledigt: { emoji: '⚪', label: 'Erledigt', color: 0x99AAB5 }
    };

    const s = statusMap[auftrag.status] || statusMap.offen;

    const embed = new EmbedBuilder()
        .setTitle(`📋 Auftrag #${auftrag.id}`)
        .setColor(s.color)
        .addFields(
            { name: '📦 Item', value: auftrag.item, inline: true },
            { name: '🔢 Menge', value: auftrag.menge, inline: true },
            { name: '💰 Entlohnung', value: auftrag.entlohnung, inline: true },
            { name: '📌 Status', value: `${s.emoji} ${s.label}`, inline: true },
            { name: '👤 Auftraggeber', value: `<@${auftrag.auftraggeber_id}>`, inline: true }
        )
        .setTimestamp(new Date(auftrag.created_at))
        .setFooter({ text: 'MET Auftragssystem' });

    if (auftrag.bearbeiter_id) {
        embed.addFields({ name: '🛠️ Bearbeiter', value: `<@${auftrag.bearbeiter_id}>`, inline: true });
    }

    return embed;
}

// ─── Button Builder ──────────────────────────────────────
function buildButtons(auftrag) {
    const row = new ActionRowBuilder();

    if (auftrag.status === 'offen') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`auftrag_annehmen_${auftrag.id}`)
                .setLabel('Auftrag annehmen')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅')
        );
    } else if (auftrag.status === 'in_bearbeitung') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`auftrag_abbrechen_${auftrag.id}`)
                .setLabel('Auftrag abbrechen/freigeben')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌'),
            new ButtonBuilder()
                .setCustomId(`auftrag_erledigt_${auftrag.id}`)
                .setLabel('Auftrag erledigt')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('✔️')
        );
    }

    // For 'erledigt' → no buttons (or disabled)
    if (auftrag.status === 'erledigt') {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`auftrag_closed_${auftrag.id}`)
                .setLabel('Auftrag abgeschlossen')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
        );
    }

    return row;
}

// ─── Permission Helper ──────────────────────────────────
function isAdmin(member) {
    if (!member) return false;
    if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
    if (ADMIN_ROLE_ID && member.roles?.cache?.has(ADMIN_ROLE_ID)) return true;
    return false;
}

// ─── Handle /auftrag Command ─────────────────────────────
export async function handleAuftragCommand(interaction) {
    const item = interaction.options.getString('item');
    const menge = interaction.options.getString('menge');
    const entlohnung = interaction.options.getString('entlohnung');

    const db = await getDb();

    // Insert into DB
    const result = await db.run(
        `INSERT INTO auftraege (item, menge, entlohnung, auftraggeber_id, auftraggeber_name, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 'offen', datetime('now'), datetime('now'))`,
        item, menge, entlohnung, interaction.user.id, interaction.user.username
    );

    const auftrag = await db.get('SELECT * FROM auftraege WHERE id = ?', result.lastID);

    // Build embed + buttons
    const embed = buildAuftragEmbed(auftrag);
    const row = buildButtons(auftrag);

    // Send to the configured channel
    let targetChannel;
    if (AUFTRAG_CHANNEL_ID) {
        targetChannel = await interaction.client.channels.fetch(AUFTRAG_CHANNEL_ID).catch(() => null);
    }

    if (targetChannel && targetChannel.id !== interaction.channelId) {
        // Post embed in the dedicated channel
        const msg = await targetChannel.send({ embeds: [embed], components: [row] });

        // Store message reference
        await db.run(
            'UPDATE auftraege SET discord_message_id = ?, discord_channel_id = ? WHERE id = ?',
            msg.id, targetChannel.id, auftrag.id
        );

        // Reply to the user ephemerally
        await interaction.reply({
            content: `✅ Auftrag #${auftrag.id} wurde erstellt und in <#${AUFTRAG_CHANNEL_ID}> gepostet!`,
            ephemeral: true // ephemeral
        });
    } else {
        // Post in the same channel where the command was used
        const msg = await interaction.reply({
            embeds: [embed],
            components: [row],
            fetchReply: true
        });

        await db.run(
            'UPDATE auftraege SET discord_message_id = ?, discord_channel_id = ? WHERE id = ?',
            msg.id, interaction.channelId, auftrag.id
        );
    }

    console.log(`[Auftrag] ✓ Auftrag #${auftrag.id} erstellt von ${interaction.user.username}`);
}

// ─── Handle Button Interactions ──────────────────────────
export async function handleAuftragButton(interaction) {
    const customId = interaction.customId;

    if (!customId.startsWith('auftrag_')) return false;

    const parts = customId.split('_');
    const action = parts.slice(1, -1).join('_'); // annehmen | abbrechen | erledigt
    const auftragId = parseInt(parts[parts.length - 1]);

    if (isNaN(auftragId)) return false;

    const db = await getDb();
    const auftrag = await db.get('SELECT * FROM auftraege WHERE id = ?', auftragId);

    if (!auftrag) {
        await interaction.reply({ content: '❌ Auftrag nicht gefunden.', ephemeral: true });
        return true;
    }

    const userId = interaction.user.id;
    const member = interaction.member;

    // ── ANNEHMEN ──
    if (action === 'annehmen') {
        if (auftrag.status !== 'offen') {
            await interaction.reply({ content: '⚠️ Dieser Auftrag ist nicht mehr offen.', ephemeral: true });
            return true;
        }

        await db.run(
            `UPDATE auftraege SET status = 'in_bearbeitung', bearbeiter_id = ?, bearbeiter_name = ?, updated_at = datetime('now') WHERE id = ?`,
            userId, interaction.user.username, auftragId
        );

        const updated = await db.get('SELECT * FROM auftraege WHERE id = ?', auftragId);
        await interaction.update({
            embeds: [buildAuftragEmbed(updated)],
            components: [buildButtons(updated)]
        });

        console.log(`[Auftrag] #${auftragId} angenommen von ${interaction.user.username}`);
        return true;
    }

    // ── ABBRECHEN / FREIGEBEN ──
    if (action === 'abbrechen') {
        if (auftrag.status !== 'in_bearbeitung') {
            await interaction.reply({ content: '⚠️ Dieser Auftrag ist nicht in Bearbeitung.', ephemeral: true });
            return true;
        }

        // Permission: Only Bearbeiter, Auftraggeber, or Admin
        const allowed = userId === auftrag.bearbeiter_id
            || userId === auftrag.auftraggeber_id
            || isAdmin(member);

        if (!allowed) {
            await interaction.reply({ content: '🚫 Das ist nicht dein Auftrag!', ephemeral: true });
            return true;
        }

        await db.run(
            `UPDATE auftraege SET status = 'offen', bearbeiter_id = NULL, bearbeiter_name = NULL, updated_at = datetime('now') WHERE id = ?`,
            auftragId
        );

        const updated = await db.get('SELECT * FROM auftraege WHERE id = ?', auftragId);
        await interaction.update({
            embeds: [buildAuftragEmbed(updated)],
            components: [buildButtons(updated)]
        });

        console.log(`[Auftrag] #${auftragId} freigegeben von ${interaction.user.username}`);
        return true;
    }

    // ── ERLEDIGT ──
    if (action === 'erledigt') {
        if (auftrag.status !== 'in_bearbeitung') {
            await interaction.reply({ content: '⚠️ Dieser Auftrag ist nicht in Bearbeitung.', ephemeral: true });
            return true;
        }

        // Permission: Only Bearbeiter or Admin
        const allowed = userId === auftrag.bearbeiter_id || isAdmin(member);

        if (!allowed) {
            await interaction.reply({ content: '🚫 Das ist nicht dein Auftrag!', ephemeral: true });
            return true;
        }

        await db.run(
            `UPDATE auftraege SET status = 'erledigt', updated_at = datetime('now') WHERE id = ?`,
            auftragId
        );

        const updated = await db.get('SELECT * FROM auftraege WHERE id = ?', auftragId);
        await interaction.update({
            embeds: [buildAuftragEmbed(updated)],
            components: [buildButtons(updated)]
        });

        console.log(`[Auftrag] #${auftragId} erledigt von ${interaction.user.username}`);
        return true;
    }

    // closed button (disabled) — should never fire, but handle gracefully
    if (action === 'closed') {
        await interaction.reply({ content: 'Dieser Auftrag ist bereits abgeschlossen.', ephemeral: true });
        return true;
    }

    return false;
}
