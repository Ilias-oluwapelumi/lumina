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
         * Clean API key and mandatory parameters
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
         * Construct JSON object and stringify payload
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

        const jsonBody = JSON.stringify(rawPayload);

        console.log('Sending JSON String:', jsonBody);

        /**
         * Send request to HeedPay using Native Fetch API
         * This forces standard Content-Length headers without chunked transfer stream issues
         */
        const response = await fetch('https://heedpay.com.ng/api/create-virtual-account', {
            method: 'POST',
            headers: {
                'Authorization': formattedToken,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'NodeJS/Fetch-Client',
            },
            body: jsonBody,
        });

        const responseText = await response.text();

        console.log('======================================');
        console.log('HEEDPAY RAW RESPONSE');
        console.log('======================================');
        console.log('Raw Body:', responseText);

        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            throw new Error(`Invalid non-JSON server response: ${responseText}`);
        }

        /**
         * Check successful response
         */
        if (data && data.status === 'success') {
            return data.data;
        }

        throw new Error(data?.message || 'Failed to create static virtual account');

    } catch (err) {
        console.error('======================================');
        console.error('HEEDPAY ERROR');
        console.error('======================================');
        console.error('Error:', err.message);

        throw new Error(err.message);
    }
}

module.center = {
    generateRefId,
    createVirtualAccount,
};