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
    email = '',
    accountName = '',
    phoneNumber = '',
    identityType = 'bvn',
    identityNumber = '',
    bankCode = 'palmpay',
    businessId = '',
    apiKey = '',
}) {
    try {
        console.log('======================================');
        console.log('HEEDPAY STATIC ACCOUNT REQUEST');
        console.log('======================================');

        /**
         * Clean API key and parameters
         */
        const cleanKey = apiKey ? String(apiKey).trim() : '';

        if (!cleanKey) {
            throw new Error('HeedPay access token/API key is missing.');
        }

        if (!businessId) {
            throw new Error('HeedPay businessId is missing.');
        }

        /**
         * Format Authorization header
         */
        const formattedToken = cleanKey.startsWith('Token ')
            ? cleanKey
            : `Token ${cleanKey}`;

        /**
         * Generate reference ID
         */
        const refId = generateRefId();

        /**
         * Construct JSON payload
         * Explicitly fallback undefined values to empty strings to avoid invalid JSON output
         */
        const rawPayload = {
            refId: String(refId),
            email: String(email).trim(),
            account_name: String(accountName).trim(),
            phone_number: String(phoneNumber).trim(),
            identityType: String(identityType).trim(),
            identityNumber: String(identityNumber).trim(),
            account_type: 'STATIC',
            bankCode: String(bankCode).trim(),
            businessId: String(businessId).trim(),
        };

        const jsonStringData = JSON.stringify(rawPayload);

        console.log('Sending JSON String:', jsonStringData);

        /**
         * Send request to HeedPay using Axios
         */
        const response = await axios({
            method: 'post',
            url: 'https://heedpay.com.ng/api/create-virtual-account',
            data: jsonStringData,
            headers: {
                'Authorization': formattedToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: 30000,
            transformRequest: [(data) => data], // Prevents Axios from altering the raw JSON string
        });

        const data = response.data;

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