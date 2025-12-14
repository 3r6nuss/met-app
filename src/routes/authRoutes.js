import express from 'express';
import passport from 'passport';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { getDb } from '../db/database.js';

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
        callbackURL: process.env.DISCORD_CALLBACK_URL,
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
    }
    res.redirect('/');
});

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

export default router;
