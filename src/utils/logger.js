// ─── LOGGER ──────────────────────────────────────────────────────────────────
// A thin wrapper around console.* that:
//  1. Silences debug/info noise in production (NODE_ENV=production) — only
//     warnings and errors get through, so logs stay readable and cheap.
//  2. Automatically redacts known-sensitive fields (pin, password, token,
//     etc.) from any object passed in, so a stray `logger.info(req.body)`
//     can't leak a PIN or password into your log provider.
//  3. Gives every log line a consistent, greppable shape.

const isProd = process.env.NODE_ENV === "production";

const SENSITIVE_KEYS = new Set([
    "pin",
    "oldpin",
    "newpin",
    "password",
    "currentpassword",
    "newpassword",
    "passwordhash",
    "transactionpin",
    "token",
    "accesstoken",
    "refreshtoken",
    "authorization",
]);

function redact(value, depth = 0) {
    if (depth > 4 || value === null || value === undefined) return value;

    if (Array.isArray(value)) {
        return value.map((v) => redact(v, depth + 1));
    }

    if (typeof value === "object") {
        const out = {};
        for (const [key, val] of Object.entries(value)) {
            if (SENSITIVE_KEYS.has(key.toLowerCase())) {
                out[key] = "[REDACTED]";
            } else {
                out[key] = redact(val, depth + 1);
            }
        }
        return out;
    }

    return value;
}

function format(level, args) {
    const timestamp = new Date().toISOString();
    const safeArgs = args.map((a) =>
        typeof a === "object" ? redact(a) : a
    );
    return [`[${timestamp}] [${level}]`, ...safeArgs];
}

const logger = {
    // Verbose, developer-only detail (raw provider payloads, request
    // bodies, etc). Silenced in production — this is the only level that
    // gets suppressed, since it's the one most likely to contain noisy or
    // borderline-sensitive detail that's only useful while developing.
    debug: (...args) => {
        if (!isProd) console.log(...format("DEBUG", args));
    },

    // Normal operational messages (server started, DB connected, demo
    // data seeded, etc). Always printed — this is what tells you the
    // service is healthy in production, not just in development.
    info: (...args) => {
        console.log(...format("INFO", args));
    },

    // Always logged — something unexpected but non-fatal.
    warn: (...args) => {
        console.warn(...format("WARN", args));
    },

    // Always logged — something failed. Pass the Error object itself
    // (not just err.message) so the stack trace is captured.
    error: (...args) => {
        console.error(...format("ERROR", args));
    },
};

module.exports = logger;