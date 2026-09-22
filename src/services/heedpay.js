const axios = require('axios');

/**
 * Generate HeedPay refId
 * Format:
 * YYYYMMDD + 12 random characters
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
 * Create HeedPay Static Virtual Account
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
        console.log('========================================');
        console.log('HEEDPAY CREATE VIRTUAL ACCOUNT');
        console.log('========================================');

        // Clean API key
        const cleanKey = apiKey
            ? String(apiKey).trim()
            : '';

        // DEBUG - check whether token exists
        console.log(
            'Access Token received:',
            cleanKey ? 'YES' : 'NO'
        );

        console.log(
            'Access Token length:',
            cleanKey.length
        );

        if (!cleanKey) {
            throw new Error(
                'HEEDPAY_API_KEY is missing.'
            );
        }

        if (!businessId) {
            throw new Error(
                'HEEDPAY_BUSINESS_ID is missing.'
            );
        }

        /**
         * Generate refId
         */
        const refId = generateRefId();

        /**
         * EXACT JSON STRUCTURE FROM HEEDPAY EXAMPLE
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

        console.log('Ref ID:', refId);

        console.log(
            'JSON BODY:',
            JSON.stringify(payload, null, 2)
        );

        /**
         * Authorization
         *
         * Based on your previous implementation,
         * this sends:
         *
         * Authorization: Token YOUR_API_KEY
         */
        const authorization = cleanKey.startsWith('Token ')
            ? cleanKey
            : `Token ${cleanKey}`;

        console.log(
            'Authorization header exists:',
            authorization ? 'YES' : 'NO'
        );

        /**
         * SEND REQUEST
         */
        const response = await axios.post(
            'https://heedpay.com.ng/api/create-virtual-account',

            // Explicit JSON
            JSON.stringify(payload),

            {
                headers: {
                    'Authorization': authorization,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },

                timeout: 30000,

                // Make sure Axios doesn't transform it unexpectedly
                transformRequest: [
                    (data) => data
                ],
            }
        );

        console.log('========================================');
        console.log('HEEDPAY RESPONSE');
        console.log('========================================');

        console.log(
            'HTTP STATUS:',
            response.status
        );

        console.log(
            'RESPONSE:',
            JSON.stringify(response.data, null, 2)
        );

        const data = response.data;

        /**
         * SUCCESS
         */
        if (data?.status === 'success') {

            console.log(
                'Virtual account created successfully.'
            );

            console.log(
                'Virtual Number:',
                data.data?.virtualNumber
            );

            console.log(
                'Bank Name:',
                data.data?.bankName
            );

            return data.data;
        }

        /**
         * HEEDPAY RETURNED FAILURE
         */
        throw new Error(
            data?.message ||
            'Failed to create static virtual account'
        );

    } catch (err) {

        console.error('========================================');
        console.error('HEEDPAY ERROR');
        console.error('========================================');

        console.error(
            'Error:',
            err.message
        );

        if (err.response) {

            console.error(
                'HTTP Status:',
                err.response.status
            );

            console.error(
                'Response:',
                JSON.stringify(
                    err.response.data,
                    null,
                    2
                )
            );
        }

        throw new Error(
            err.response?.data?.message ||
            err.message
        );
    }
}

module.exports = {
    generateRefId,
    createVirtualAccount,
};