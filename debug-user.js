import { getDb } from './src/db/database.js';

async function fixUser() {
    const db = await getDb();

    // Restore the correct employeeName
    await db.run(`
        UPDATE users SET employeeName = 'Rikkard Bach'
        WHERE discordId = '823276402320998450'
    `);

    const user = await db.get("SELECT * FROM users WHERE discordId = '823276402320998450'");
    console.log('Fixed DevAdmin User:', JSON.stringify(user, null, 2));
    process.exit(0);
}

fixUser();
