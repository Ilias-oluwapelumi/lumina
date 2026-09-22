const https = require('https');
const { URL } = require('url');

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
    return new Promise((resolve, reject) => {
        try {
            console.log('======================================');
            console.log('HEEDPAY STATIC ACCOUNT REQUEST');
            console.log('======================================');

            const cleanKey = apiKey ? String(apiKey).trim() : '';

            if (!cleanKey) {
                return reject(new Error('HeedPay access token/API key is missing.'));
            }

            if (!businessId) {
                return reject(new Error('HeedPay businessId is missing.'));
            }

            const formattedToken = cleanKey.startsWith('Token ')
                ? cleanKey
                : `Token ${cleanKey}`;

            const refId = generateRefId();

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

            // Using direct endpoint with .php extension and fallback options
            const targetUrl = new URL('https://heedpay.com.ng/api/create-virtual-account/index.php');

            const options = {
                hostname: targetUrl.hostname,
                port: 443,
                path: targetUrl.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': formattedToken,
                    'Content-Length': Buffer.byteLength(jsonBody),
                    'User-Agent': 'HeedPay-NodeJS-SDK/1.0',
                },
            };

            console.log(`Sending POST request to ${targetUrl.href}...`);
            console.log('Payload:', jsonBody);

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    console.log('======================================');
                    console.log('HEEDPAY RAW RESPONSE');
                    console.log('======================================');
                    console.log('Status Code:', res.statusCode);
                    console.log('Raw Body:', responseData);

                    let data;
                    try {
                        data = JSON.parse(responseData);
                    } catch (parseErr) {
                        return reject(
                            new Error(`Invalid response from server: ${responseData}`)
                        );
                    }

                    if (data && (data.status === 'success' || data.status === 'true' || data.code === 200)) {
                        return resolve(data.data || data);
                    }

                    return reject(
                        new Error(data?.message || 'Failed to create virtual account')
                    );
                });
            });

            req.on('error', (err) => {
                console.error('Request Error:', err.message);
                reject(err);
            });

            // Write JSON string directly to stream buffer
            req.write(jsonBody);
            req.end();

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = {
    generateRefId,
    createVirtualAccount,
};