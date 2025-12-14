export const logger = (req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    const { method, url, body, query, user } = req;

    // Log request details
    console.log(`[${timestamp}] ${method} ${url}`);

    // Log authenticated user if present
    if (user) {
        console.log(`\tUser: ${user.username} (${user.discordId}) - Role: ${user.role}`);
    }

    // Log body for non-GET requests (excluding massive payloads if necessary)
    if (method !== 'GET' && Object.keys(body).length > 0) {
        // Create a safe copy to avoid logging sensitive fields if any (like passwords, though not applicable here yet)
        const safeBody = { ...body };
        console.log(`\tBody: ${JSON.stringify(safeBody).substring(0, 500)}${JSON.stringify(safeBody).length > 500 ? '...' : ''}`);
    }

    if (Object.keys(query).length > 0) {
        console.log(`\tQuery: ${JSON.stringify(query)}`);
    }

    // Capture response finish to log duration
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const color = status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : '\x1b[32m'; // Red, Yellow, Green
        const reset = '\x1b[0m';

        console.log(`\t${color}Status: ${status}${reset} - ${duration}ms`);
    });

    next();
};
