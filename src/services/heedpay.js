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

        console.log(
            'URL:',
            'https://heedpay.com.ng/api/create-virtual-account'
        );

        /**
         * Clean API key
         */
        const cleanKey = apiKey ? String(apiKey).trim() : '';

        /**
         * ECHO ACCESS TOKEN
         * This is what HeedPay asked you to check.
         */
        console.log('======================================');
        console.log('HEEDPAY AUTH DEBUG');
        console.log('======================================');

        console.log('Access Token:', cleanKey);
        console.log('Token Type:', typeof cleanKey);
        console.log('Token Length:', cleanKey.length);

        /**
         * Format Authorization header
         *
         * Expected:
         * Authorization: Token YOUR_API_KEY
         */
        const formattedToken = cleanKey.startsWith('Token ')
            ? cleanKey
            : `Token ${cleanKey}`;

        console.log('Formatted Authorization:', formattedToken);

        /**
         * Stop if API key is missing
         */
        if (!cleanKey) {
            throw new Error(
                'HeedPay access token/API key is missing.'
            );
        }

        /**
         * Stop if business ID is missing
         */
        if (!businessId) {
            throw new Error(
                'HeedPay businessId is missing.'
            );
        }

        /**
         * Generate reference ID
         */
        const refId = generateRefId();

        console.log('Generated refId:', refId);

        /**
         * Request payload
         */
        const payload = {
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

        console.log(
            'Request Payload:',
            JSON.stringify(payload, null, 2)
        );

        /**
         * Send request to HeedPay
         */
        const { data } = await axios.post(
            'https://heedpay.com.ng/api/create-virtual-account',
            payload,
            {
                headers: {
                    'Authorization': formattedToken,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                timeout: 30000,
            }
        );

        /**
         * Log response
         */
        console.log('======================================');
        console.log('HEEDPAY RESPONSE');
        console.log('======================================');

        console.log(
            'Response:',
            JSON.stringify(data, null, 2)
        );

        /**
         * Check successful response
         */
        if (data && data.status === 'success') {
            console.log(
                'Virtual account created successfully.'
            );

            return data.data;
        }

        /**
         * HeedPay returned an unsuccessful response
         */
        throw new Error(
            data?.message ||
            'Failed to create static virtual account'
        );

    } catch (err) {

        console.error('======================================');
        console.error('HEEDPAY ERROR');
        console.error('======================================');

        console.error(
            'Error:',
            err.message
        );

        console.error(
            'Status:',
            err.response?.status
        );

        console.error(
            'Response Data:',
            JSON.stringify(
                err.response?.data,
                null,
                2
            )
        );

        throw new Error(
            err.response?.data?.message ||
            err.message
        );
    }
}

/**
 * Export functions
 */
module.exports = {
    generateRefId,
    createVirtualAccount,
};