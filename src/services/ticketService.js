/**
 * Ticketsystem — Discord Support Tickets
 * Panel mit Kategorien, private Ticket-Channels, Transkript für die Website.
 */

import {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ChannelType,
    PermissionFlagsBits
} from 'discord.js';
import { getDb } from '../db/database.js';

// ─── Config ──────────────────────────────────────────────
// Kategorie unter der die Ticket-Channels erstellt werden (Discord Kategorie-ID)
const TICKET_PARENT_CATEGORY_ID = process.env.DISCORD_TICKET_CATEGORY_ID || null;
// Rolle die alle Tickets sehen/bearbeiten darf (Support-Team)
const TICKET_STAFF_ROLE_ID = process.env.DISCORD_TICKET_STAFF_ROLE_ID || null;

// Basis-URL der Website für Transkript-Links
function getTranscriptBaseUrl() {
    if (process.env.TICKET_TRANSCRIPT_BASE_URL) {
        return process.env.TICKET_TRANSCRIPT_BASE_URL.replace(/\/$/, '');
    }
    if (process.env.DISCORD_CALLBACK_URL) {
        try {
            return new URL(process.env.DISCORD_CALLBACK_URL).origin;
        } catch {
            /* ignore */
        }
    }
    return '';
}

// Ticket-Kategorien werden in der DB verwaltet (Tabelle ticket_categories),
// inkl. der Rollen die den jeweiligen Ticket-Channel sehen dürfen.
const DEFAULT_CATEGORIES = [
    { value: 'bewerbungen', label: 'Bewerbungen', emoji: '📝', description: 'Bewerbung bei MET', role_ids: [] },
    { value: 'bestellungen', label: 'Bestellungen', emoji: '📦', description: 'Bestellungen aufgeben', role_ids: [] },
    { value: 'support', label: 'Support', emoji: '❓', description: 'Allgemeine Hilfe & Fragen', role_ids: [] },
    { value: 'ankauf', label: 'Ankauf', emoji: '💰', description: 'An- & Verkaufsanfragen', role_ids: [] },
    { value: 'sonstiges', label: 'Sonstiges', emoji: '💬', description: 'Alles andere', role_ids: [] }
];

function parseRoleIds(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
    } catch {
        return [];
    }
}

async function getCategories() {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT * FROM ticket_categories ORDER BY sort_order ASC, label ASC');
        if (rows && rows.length) {
            return rows.map(r => ({
                value: r.value,
                label: r.label || r.value,
                emoji: r.emoji || undefined,
                description: r.description || undefined,
                role_ids: parseRoleIds(r.role_ids)
            }));
        }
    } catch (err) {
        console.error('[Ticket] Kategorien konnten nicht geladen werden:', err.message);
    }
    return DEFAULT_CATEGORIES;
}

async function getCategory(value) {
    const cats = await getCategories();
    return cats.find(c => c.value === value) || null;
}

async function categoryLabel(value) {
    const cat = await getCategory(value);
    return cat ? cat.label : value;
}

// ─── Slash-Command Definitionen ──────────────────────────
export const ticketCommands = [
    new SlashCommandBuilder()
        .setName('ticket-panel')
        .setDescription('Postet das Ticket-Panel zum Öffnen neuer Tickets')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString())
];

// ─── Panel-Nachricht bauen ───────────────────────────────
async function buildPanel() {
    const categories = await getCategories();

    const embed = new EmbedBuilder()
        .setTitle('🎫 MET Support-Tickets')
        .setDescription(
            'Du brauchst Hilfe oder hast ein Anliegen?\n' +
            'Wähle unten eine **Kategorie**, um ein privates Ticket zu öffnen.\n\n' +
            'Ein Teammitglied meldet sich so schnell wie möglich bei dir.'
        )
        .setColor(0x8B5CF6)
        .setFooter({ text: 'MET Ticketsystem' });

    const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_create')
        .setPlaceholder('📁 Kategorie auswählen …')
        .addOptions(categories.map(c => {
            const opt = { label: c.label, value: c.value };
            if (c.description) opt.description = c.description;
            if (c.emoji) opt.emoji = c.emoji;
            return opt;
        }));

    const row = new ActionRowBuilder().addComponents(menu);
    return { embeds: [embed], components: [row] };
}

// ─── Buttons im Ticket-Channel ───────────────────────────
function buildTicketControls(ticket) {
    const row = new ActionRowBuilder();
    if (!ticket.claimed_by_id) {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_claim_${ticket.id}`)
                .setLabel('Übernehmen')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🙋')
        );
    }
    row.addComponents(
        new ButtonBuilder()
            .setCustomId(`ticket_close_${ticket.id}`)
            .setLabel('Ticket schließen')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🔒')
    );
    return row;
}

function isStaff(member) {
    if (!member) return false;
    if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
    if (TICKET_STAFF_ROLE_ID && member.roles?.cache?.has(TICKET_STAFF_ROLE_ID)) return true;
    return false;
}

// Prüft ob ein Member ein Ticket bearbeiten darf (Staff ODER eine der Kategorie-Rollen)
async function memberCanHandleTicket(member, ticket) {
    if (isStaff(member)) return true;
    if (!member || !ticket) return false;
    const cat = await getCategory(ticket.category);
    const roleIds = cat ? cat.role_ids : [];
    return roleIds.some(id => member.roles?.cache?.has(id));
}

// ─── /ticket-panel Command ───────────────────────────────
export async function handleTicketPanelCommand(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({ content: '🚫 Du hast keine Berechtigung dafür.', ephemeral: true });
        return;
    }

    await interaction.channel.send(await buildPanel());
    await interaction.reply({ content: '✅ Ticket-Panel wurde gepostet.', ephemeral: true });
}

// ─── Ticket erstellen (Select-Menu) ──────────────────────
export async function handleTicketCreate(interaction) {
    const category = interaction.values?.[0];
    if (!category) {
        await interaction.reply({ content: '❌ Keine Kategorie ausgewählt.', ephemeral: true });
        return;
    }

    const guild = interaction.guild;
    if (!guild) {
        await interaction.reply({ content: '❌ Nur auf einem Server möglich.', ephemeral: true });
        return;
    }

    await interaction.deferReply({ ephemeral: true });

    const db = await getDb();

    // Verhindern, dass ein User mehrere offene Tickets hat
    const existing = await db.get(
        `SELECT * FROM tickets WHERE opener_id = ? AND status = 'open'`,
        interaction.user.id
    );
    if (existing && existing.discord_channel_id) {
        await interaction.editReply({
            content: `⚠️ Du hast bereits ein offenes Ticket: <#${existing.discord_channel_id}>`
        });
        return;
    }

    // Fortlaufende Ticketnummer
    const row = await db.get('SELECT COALESCE(MAX(ticket_number), 0) + 1 AS next FROM tickets');
    const ticketNumber = row.next;

    // Kategorie-Konfiguration (welche Rollen dürfen den Channel sehen)
    const catConfig = await getCategory(category);
    const catLabel = catConfig ? catConfig.label : category;
    const categoryRoleIds = catConfig ? catConfig.role_ids : [];

    // Permission-Overwrites: nur Ersteller + Bot + konfigurierte Rollen sehen das Ticket
    const overwrites = [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        {
            id: interaction.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles,
                PermissionFlagsBits.EmbedLinks
            ]
        }
    ];
    if (interaction.client.user) {
        overwrites.push({
            id: interaction.client.user.id,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.ManageChannels
            ]
        });
    }

    // Rollen aus der Kategorie-Konfiguration + optionale globale Staff-Rolle
    const mentionRoleIds = new Set();
    const roleIdsToAdd = new Set([...categoryRoleIds]);
    if (TICKET_STAFF_ROLE_ID) roleIdsToAdd.add(TICKET_STAFF_ROLE_ID);

    for (const roleId of roleIdsToAdd) {
        // Nur Rollen übernehmen, die es auf dem Server gibt
        if (!guild.roles.cache.has(roleId)) continue;
        overwrites.push({
            id: roleId,
            allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ReadMessageHistory,
                PermissionFlagsBits.AttachFiles
            ]
        });
        mentionRoleIds.add(roleId);
    }

    let channel;
    try {
        channel = await guild.channels.create({
            name: `ticket-${String(ticketNumber).padStart(4, '0')}`,
            type: ChannelType.GuildText,
            parent: TICKET_PARENT_CATEGORY_ID || undefined,
            topic: `Ticket #${ticketNumber} • ${catLabel} • ${interaction.user.tag}`,
            permissionOverwrites: overwrites
        });
    } catch (err) {
        console.error('[Ticket] Konnte Channel nicht erstellen:', err);
        await interaction.editReply({
            content: '❌ Ticket-Channel konnte nicht erstellt werden. Bitte kontaktiere einen Admin (Bot-Rechte prüfen).'
        });
        return;
    }

    const avatar = interaction.user.avatar || null;
    const result = await db.run(
        `INSERT INTO tickets
            (ticket_number, category, status, opener_id, opener_name, opener_avatar, discord_channel_id, guild_id, created_at)
         VALUES (?, ?, 'open', ?, ?, ?, ?, ?, datetime('now'))`,
        ticketNumber, category, interaction.user.id, interaction.user.username, avatar, channel.id, guild.id
    );
    const ticket = await db.get('SELECT * FROM tickets WHERE id = ?', result.lastID);

    const welcome = new EmbedBuilder()
        .setTitle(`🎫 Ticket #${ticketNumber} — ${catLabel}`)
        .setDescription(
            `Hallo <@${interaction.user.id}>, willkommen in deinem Ticket!\n\n` +
            'Beschreibe bitte dein Anliegen so genau wie möglich. ' +
            'Ein Teammitglied wird sich in Kürze bei dir melden.\n\n' +
            'Mit **🔒 Ticket schließen** kannst du (oder das Team) das Ticket beenden.'
        )
        .setColor(0x8B5CF6)
        .setTimestamp();

    const roleMentions = [...mentionRoleIds].map(id => `<@&${id}>`).join(' ');
    await channel.send({
        content: `<@${interaction.user.id}>${roleMentions ? ` • ${roleMentions}` : ''}`,
        embeds: [welcome],
        components: [buildTicketControls(ticket)]
    });

    await interaction.editReply({ content: `✅ Dein Ticket wurde erstellt: <#${channel.id}>` });
    console.log(`[Ticket] #${ticketNumber} erstellt von ${interaction.user.tag} (${category})`);
}

// ─── Ticket übernehmen ───────────────────────────────────
export async function handleTicketClaim(interaction, ticketId) {
    const db = await getDb();
    const ticket = await db.get('SELECT * FROM tickets WHERE id = ?', ticketId);
    if (!ticket) {
        await interaction.reply({ content: '❌ Ticket nicht gefunden.', ephemeral: true });
        return;
    }
    if (!(await memberCanHandleTicket(interaction.member, ticket))) {
        await interaction.reply({ content: '🚫 Nur das Team kann Tickets übernehmen.', ephemeral: true });
        return;
    }
    if (ticket.claimed_by_id) {
        await interaction.reply({ content: `⚠️ Bereits übernommen von <@${ticket.claimed_by_id}>.`, ephemeral: true });
        return;
    }

    await db.run(
        'UPDATE tickets SET claimed_by_id = ?, claimed_by_name = ? WHERE id = ?',
        interaction.user.id, interaction.user.username, ticketId
    );
    const updated = await db.get('SELECT * FROM tickets WHERE id = ?', ticketId);

    await interaction.update({ components: [buildTicketControls(updated)] }).catch(() => {});
    await interaction.channel.send(`🙋 <@${interaction.user.id}> kümmert sich jetzt um dieses Ticket.`);
    console.log(`[Ticket] #${ticket.ticket_number} übernommen von ${interaction.user.tag}`);
}

// ─── Ticket schließen + Transkript speichern ─────────────
export async function handleTicketClose(interaction, ticketId) {
    const db = await getDb();
    const ticket = await db.get('SELECT * FROM tickets WHERE id = ?', ticketId);
    if (!ticket) {
        await interaction.reply({ content: '❌ Ticket nicht gefunden.', ephemeral: true });
        return;
    }
    if (ticket.status === 'closed') {
        await interaction.reply({ content: '⚠️ Ticket ist bereits geschlossen.', ephemeral: true });
        return;
    }

    const allowed = interaction.user.id === ticket.opener_id || (await memberCanHandleTicket(interaction.member, ticket));
    if (!allowed) {
        await interaction.reply({ content: '🚫 Du darfst dieses Ticket nicht schließen.', ephemeral: true });
        return;
    }

    await interaction.reply({ content: '🔒 Ticket wird geschlossen und das Transkript gespeichert …', ephemeral: true });

    const channel = interaction.channel;

    // Alle Nachrichten des Channels abrufen (chronologisch)
    const collected = [];
    try {
        let lastId;
        while (collected.length < 2000) {
            const opts = { limit: 100 };
            if (lastId) opts.before = lastId;
            const batch = await channel.messages.fetch(opts);
            if (batch.size === 0) break;
            collected.push(...batch.values());
            lastId = batch.last().id;
            if (batch.size < 100) break;
        }
    } catch (err) {
        console.error('[Ticket] Konnte Nachrichten nicht laden:', err);
    }
    collected.reverse();

    // Transkript in DB speichern
    await db.run('DELETE FROM ticket_messages WHERE ticket_id = ?', ticketId);
    for (const msg of collected) {
        const attachments = [...msg.attachments.values()].map(a => ({ name: a.name, url: a.url }));
        await db.run(
            `INSERT INTO ticket_messages
                (ticket_id, discord_message_id, author_id, author_name, author_avatar, is_bot, content, attachments, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ticketId,
            msg.id,
            msg.author?.id || null,
            msg.author?.username || 'Unbekannt',
            msg.author?.avatar || null,
            msg.author?.bot ? 1 : 0,
            msg.content || '',
            JSON.stringify(attachments),
            new Date(msg.createdTimestamp).toISOString()
        );
    }

    await db.run(
        `UPDATE tickets SET status = 'closed', closed_by_id = ?, closed_by_name = ?, closed_at = datetime('now') WHERE id = ?`,
        interaction.user.id, interaction.user.username, ticketId
    );

    const transcriptUrl = `${getTranscriptBaseUrl()}/tickets/${ticketId}`;

    // Log-Channel (Staff) benachrichtigen falls konfiguriert
    const logChannelId = process.env.DISCORD_TICKET_LOG_CHANNEL_ID;
    if (logChannelId) {
        try {
            const logChannel = await interaction.client.channels.fetch(logChannelId).catch(() => null);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setTitle(`🔒 Ticket #${ticket.ticket_number} geschlossen`)
                    .setColor(0x99AAB5)
                    .addFields(
                        { name: 'Kategorie', value: await categoryLabel(ticket.category), inline: true },
                        { name: 'Ersteller', value: `<@${ticket.opener_id}>`, inline: true },
                        { name: 'Geschlossen von', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Nachrichten', value: String(collected.length), inline: true }
                    )
                    .setTimestamp();
                const components = transcriptUrl
                    ? [new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setLabel('📄 Transkript ansehen').setStyle(ButtonStyle.Link).setURL(transcriptUrl)
                    )]
                    : [];
                await logChannel.send({ embeds: [logEmbed], components });
            }
        } catch (err) {
            console.error('[Ticket] Log-Channel Fehler:', err.message);
        }
    }

    console.log(`[Ticket] #${ticket.ticket_number} geschlossen von ${interaction.user.tag}, ${collected.length} Nachrichten archiviert`);

    // Channel nach kurzer Verzögerung löschen
    setTimeout(async () => {
        try {
            await channel.delete(`Ticket #${ticket.ticket_number} geschlossen`);
        } catch (err) {
            console.error('[Ticket] Channel löschen fehlgeschlagen:', err.message);
        }
    }, 5000);
}

// ─── Router für Button-/Select-Interaktionen ─────────────
export async function handleTicketInteraction(interaction) {
    // Select-Menu: Ticket erstellen
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_create') {
        await handleTicketCreate(interaction);
        return true;
    }

    if (interaction.isButton()) {
        const customId = interaction.customId;
        if (!customId.startsWith('ticket_')) return false;

        const claimMatch = customId.match(/^ticket_claim_(\d+)$/);
        if (claimMatch) {
            await handleTicketClaim(interaction, parseInt(claimMatch[1], 10));
            return true;
        }
        const closeMatch = customId.match(/^ticket_close_(\d+)$/);
        if (closeMatch) {
            await handleTicketClose(interaction, parseInt(closeMatch[1], 10));
            return true;
        }
    }

    return false;
}
