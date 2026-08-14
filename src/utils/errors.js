// ─── ERROR RESPONSE HELPER ───────────────────────────────────────────────────
// Use this for any 500-level (unexpected) error instead of writing
// `res.status(500).json({ message: err.message })` by hand — that pattern
// leaks whatever a database driver, Mongoose, or a third-party SDK put in
// its error message straight to the client (connection strings, internal
// field names, stack fragments, etc).
//
// 400/401/403/404-level errors that YOU wrote on purpose (e.g. "Invalid
// data plan selected", "Insufficient wallet balance") are already safe to
// show the user as-is — those don't need this helper, keep constructing
// them the way the codebase already does.

const logger = require("./logger");

/**
 * Logs the full error (with stack) server-side, then sends a client-safe
 * response. In development the real error message is still included to
 * speed up debugging; in production it's replaced with a generic message
 * unless the error was explicitly marked safe to expose.
 *
 * @param {import('express').Response} res
 * @param {Error} err
 * @param {object} [options]
 * @param {string} [options.context] - short label for where this happened, e.g. "buyAirtime"
 * @param {number} [options.status] - HTTP status to send (default 500)
 * @param {string} [options.fallback] - message shown to the client in production
 */
function sendServerError(res, err, options = {}) {
    const {
        context = "unhandled",
        status = 500,
        fallback = "Something went wrong. Please try again.",
    } = options;

    logger.error(`[${context}]`, err);

    const isProd = process.env.NODE_ENV === "production";
    const message = err.expose || !isProd ? err.message : fallback;

    return res.status(status).json({ success: false, message });
}

module.exports = { sendServerError };