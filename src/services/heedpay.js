const axios = require('axios');

/**
 * Helper function to generate a valid refId
 * Rule: Must start with YYYYMMDD and be 12-30 characters
 */
function generateRefId() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const datePrefix = `${year}${month}${day}`;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    let randomPart = '';

    for (let i = 0; i < 12; i++) {
        randomPart += chars.charAt(
            Math.floor(Math.random() * chars.length)
        );
    }

    return datePrefix + randomPart;
}

/**
 * Provision Static Virtual Account
 */
async function createVirtualAccount({
    email,
    accountName,
    phoneNumber,
    identityType = 'bvn',
    identityNumber,
    bankCode = 'palmpay',
    businessId,
    apiKey,
}) {
    try {
        console.log('======================================');
        console.log('HEEDPAY STATIC ACCOUNT REQUEST');
        console.log('======================================');

        /**
         * Clean API key
         */
        const cleanKey = apiKey ? String(apiKey).trim() : '';

        /**
         * Stop if API key is missing
         */
        if (!cleanKey) {
            throw new Error('HeedPay access token/API key is missing.');
        }

        /**
         * Stop if business ID is missing
         */
        if (!businessId) {
            throw new Error('HeedPay businessId is missing.');
        }

        /**
         * Format Authorization header
         *
         * HeedPay's docs specify the RAW key with NO "Token " prefix:
         *   Authorization: heedpay9g4efbt45hg0d553f297b703fb510dd46e3e5cc
         *
         * Sending "Token <key>" fails HeedPay's auth check, which comes
         * back as a misleading "must be in JSON Format" error instead of
         * a proper 401 — that was the actual cause of every failure.
         */
        const formattedToken = cleanKey;

        /**
         * Generate reference ID
         */
        const refId = generateRefId();

        /**
         * Request payload object
         */
        const payloadObject = {
            refId: refId,
            email: email,
            account_name: accountName,
            phone_number: phoneNumber,
            identityType: identityType,
            identityNumber: identityNumber,
            account_type: 'STATIC',
            bankCode: bankCode,
            businessId: businessId,
        };

        console.log('Request Payload:', payloadObject);

        /**
         * Send request to HeedPay
         * Passing 'payloadObject' directly as an Object (NOT a JSON string)
         */
        const { data } = await axios.post(
            'https://heedpay.com.ng/api/create-virtual-account',
            payloadObject,
            {
                headers: {
                    'Authorization': formattedToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                timeout: 30000,
            }
        );

        console.log('======================================');
        console.log('HEEDPAY RESPONSE');
        console.log('======================================');

        console.log('Response:', JSON.stringify(data, null, 2));

        if (data && data.status === 'success') {
            return data.data;
        }

        throw new Error(
            data?.message || 'Failed to create static virtual account'
        );

    } catch (err) {
        console.error('======================================');
        console.error('HEEDPAY ERROR');
        console.error('======================================');

        console.error('Error:', err.message);
        console.error('Status:', err.response?.status);
        console.error(
            'Response Data:',
            JSON.stringify(err.response?.data, null, 2)
        );

        throw new Error(
            err.response?.data?.message || err.message
        );
    }
}

module.exports = {
    generateRefId,
    createVirtualAccount,
};