import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const auftragCommand = new SlashCommandBuilder()
    .setName('auftrag')
    .setDescription('Erstelle einen neuen Auftrag')
    .addStringOption(opt => opt.setName('item').setDescription('Welches Item wird benötigt?').setRequired(true))
    .addStringOption(opt => opt.setName('menge').setDescription('Wie viel wird benötigt?').setRequired(true))
    .addStringOption(opt => opt.setName('entlohnung').setDescription('Wie wird entlohnt?').setRequired(true));

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

async function run() {
    try {
        const guildId = process.argv[2];
        if (!guildId) {
            console.log('Fehler: Bitte gib deine Server (Guild) ID als Parameter an.');
            console.log('Beispiel: node registerGuildCommand.js 123456789012345678');
            process.exit(1);
        }
        console.log(`Registriere Slash-Command sofort für Server: ${guildId}...`);
        const res = await rest.put(
            Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, guildId),
            { body: [auftragCommand.toJSON()] }
        );
        console.log('Erfolg!', res.length, 'Command(s) wurden sofort für den Server registriert.');
    } catch (e) {
        console.error('Fehler bei der Registrierung:', e);
    }
}
run();
