const bcrypt = require('bcryptjs');
const db = require('../config/db');

/**
 * Verify a user's transaction PIN
 */
const verifyTransactionPin = async (userId, pin) => {
    const hash = await db.getTransactionPin(userId);

    if (!hash) {
        throw new Error('Transaction PIN not set');
    }

    const valid = await bcrypt.compare(pin, hash);

    if (!valid) {
        throw new Error('Incorrect transaction PIN');
    }

    return true;
};

/**
 * Hash a new transaction PIN
 */
const hashTransactionPin = async (pin) => {
    return await bcrypt.hash(pin, 12);
};

module.exports = {
    verifyTransactionPin,
    hashTransactionPin,
};