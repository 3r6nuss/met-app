import { Strategy as DiscordStrategy } from 'passport-discord';

try {
    new DiscordStrategy({
        // clientID missing
        clientSecret: 'secret',
        callbackURL: 'url'
    }, () => { });
    console.log("Did not throw");
} catch (e) {
    console.log("Threw error:", e.message);
}
