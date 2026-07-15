const bcrypt = require('bcryptjs');
const db = require('../config/db');

module.exports = async (req, res, next) => {
    try {

        const { pin } = req.body;

        if (!pin) {
            return res.status(400).json({
                success: false,
                message: 'Transaction PIN is required'
            });
        }

        // Get PIN information
        const pinData = await db.getTransactionPin(req.user.id);

        if (!pinData || !pinData.transactionPin) {
            return res.status(400).json({
                success: false,
                message: 'Please set your transaction PIN first'
            });
        }

        // Check if PIN is temporarily locked
        if (
            pinData.pinLockedUntil &&
            new Date(pinData.pinLockedUntil) > new Date()
        ) {
            return res.status(423).json({
                success: false,
                message: 'Transaction PIN is temporarily locked. Try again later.'
            });
        }

        // Verify PIN
        const valid = await bcrypt.compare(
            pin,
            pinData.transactionPin
        );

        if (!valid) {

            await db.increasePinAttempts(req.user.id);

            return res.status(401).json({
                success: false,
                message: 'Incorrect transaction PIN'
            });
        }

        // Reset failed attempts after successful verification
        await db.resetPinAttempts(req.user.id);

        next();

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message
        });

    }
};