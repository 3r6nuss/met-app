import express from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { getDb } from '../db/database.js';
import { logAuth } from '../services/serverLogger.js';

const router = express.Router();

// Audit Log Helper (imported or redefined if needed, but ideally passed or imported from specific service)
// For now, simple implementation to avoid circular deps if auditLog was in server.js
const auditLog = async (userId, username, action, details) => {
    try {
        const db = await getDb();
        await db.run(
            'INSERT INTO audit_logs (timestamp, user_id, username, action, details) VALUES (?, ?, ?, ?, ?)',
            new Date().toISOString(), userId, username, action, details
        );
    } catch (e) {
        console.error('Audit log error:', e);
    }
};

export const setupPassport = (app) => {
    app.use(passport.initialize());
    app.use(passport.session());

    passport.serializeUser((user, done) => {
        done(null, user.id || user.discordId);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const db = await getDb();
            const user = await db.get('SELECT * FROM users WHERE discordId = ?', id);
            done(null, user || null);
        } catch (err) {
            done(err, null);
        }
    });

    passport.use(new DiscordStrategy({
        clientID: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
        callbackURL: process.env.DISCORD_CALLBACK_URL_OVERRIDE || process.env.DISCORD_CALLBACK_URL,
        scope: ['identify', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            const db = await getDb();
            const existingUser = await db.get('SELECT * FROM users WHERE discordId = ?', profile.id);

            // HARDCODED ADMIN OVERRIDE
            const isSuperAdmin = profile.id === '823276402320998450' || profile.id === '690510884639866960';
            const forcedRole = isSuperAdmin ? 'Administrator' : undefined;

            if (existingUser) {
                const newRole = forcedRole || existingUser.role;
                await db.run('UPDATE users SET username = ?, discriminator = ?, avatar = ?, role = ? WHERE discordId = ?',
                    profile.username, profile.discriminator, profile.avatar, newRole, profile.id);
                return done(null, { ...existingUser, ...profile, role: newRole });
            } else {
                const role = forcedRole || 'Pending';
                await db.run('INSERT INTO users (discordId, username, discriminator, avatar, role) VALUES (?, ?, ?, ?, ?)',
                    profile.id, profile.username, profile.discriminator, profile.avatar, role);
                return done(null, { ...profile, role, employeeName: null });
            }
        } catch (err) {
            return done(err, null);
        }
    }));
};

// Auth Routes definition
router.get('/discord', passport.authenticate('discord'));

router.get('/discord/callback', passport.authenticate('discord', {
    failureRedirect: '/'
}), async (req, res) => {
    if (req.user) {
        await auditLog(req.user.id || req.user.discordId, req.user.username, 'LOGIN', `User logged in via Discord`);
        // Server-Side Logging
        await logAuth('LOGIN', req.user.username, req.user.discordId);
    }
    res.redirect('/');
});

// DEV LOGIN - Only works on localhost, bypasses Discord OAuth
router.get('/dev-login', async (req, res) => {
    // Only allow on localhost
    const host = req.get('host') || '';
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
        return res.status(403).json({ error: 'Dev login only allowed on localhost' });
    }

    try {
        const db = await getDb();

        // Check if user already exists
        const existingUser = await db.get('SELECT * FROM users WHERE discordId = ?', '823276402320998450');

        let devUser;
        if (existingUser) {
            // Use existing user data, just ensure admin role
            devUser = {
                ...existingUser,
                role: 'Administrator',
                isHaendler: 1,
                isLagerist: 1
            };
            // Update role only if needed
            await db.run(`
                UPDATE users SET role = ?, isHaendler = ?, isLagerist = ?
                WHERE discordId = ?
            `, 'Administrator', 1, 1, existingUser.discordId);
        } else {
            // Create new dev user
            devUser = {
                discordId: '823276402320998450',
                username: 'DevAdmin',
                discriminator: '0000',
                avatar: null,
                role: 'Administrator',
                employeeName: null,
                isHaendler: 1,
                isLagerist: 1
            };
            await db.run(`
                INSERT INTO users (discordId, username, discriminator, avatar, role, employeeName, isHaendler, isLagerist) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, devUser.discordId, devUser.username, devUser.discriminator, devUser.avatar,
                devUser.role, devUser.employeeName, devUser.isHaendler, devUser.isLagerist);
        }

        // Log the user in
        req.login(devUser, (err) => {
            if (err) {
                console.error('Dev login error:', err);
                return res.status(500).json({ error: 'Login failed' });
            }
            console.log('[Auth] Dev login successful as', devUser.username, 'employeeName:', devUser.employeeName);
            res.redirect('/');
        });
    } catch (error) {
        console.error('Dev login error:', error);
        res.status(500).json({ error: 'Dev login failed' });
    }
});

router.get('/logout', async (req, res, next) => {
    const username = req.user?.username;
    const userId = req.user?.discordId;

    req.logout(async (err) => {
        if (err) { return next(err); }
        // Server-Side Logging
        if (username) {
            await logAuth('LOGOUT', username, userId);
        }
        res.redirect('/');
    });
});

export default router;
