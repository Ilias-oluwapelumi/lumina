const axios = require("axios");
const crypto = require("crypto");

const BASE_URL = process.env.MONNIFY_BASE_URL || "https://sandbox.monnify.com";
const API_KEY = process.env.MONNIFY_API_KEY;
const SECRET_KEY = process.env.MONNIFY_SECRET_KEY;
const CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE;

const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
});

/*
|--------------------------------------------------------------------------
| AUTH — GET BEARER TOKEN
|--------------------------------------------------------------------------
| Monnify tokens last ~1 hour. Cache in memory and refresh a minute early
| rather than authenticating on every request.
*/
let cachedToken = null;
let tokenExpiresAt = 0;

async function getToken() {

    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }

    const credentials = Buffer.from(`${API_KEY}:${SECRET_KEY}`).toString("base64");

    try {

        const { data } = await api.post(
            "/api/v1/auth/login",
            {},
            { headers: { Authorization: `Basic ${credentials}` } }
        );

        if (!data.requestSuccessful) {
            throw new Error(data.responseMessage || "Monnify authentication failed");
        }

        cachedToken = data.responseBody.accessToken;
        tokenExpiresAt = Date.now() + (data.responseBody.expiresIn - 60) * 1000;

        return cachedToken;

    } catch (err) {
        if (err.response?.data) {
            throw new Error(err.response.data.responseMessage || "Monnify auth error");
        }
        throw new Error(err.message);
    }
}

/*
|--------------------------------------------------------------------------
| CREATE RESERVED (VIRTUAL) ACCOUNT
|--------------------------------------------------------------------------
| accountReference must be unique per customer on YOUR side. We use
| `WALLET-${userId}` so the webhook can map a payment straight back to a
| user without a DB lookup by account number.
|
| Note: as of current CBN regulation, Monnify may require a BVN to issue a
| reserved account depending on your contract tier. If account creation
| fails asking for BVN, you'll need to collect it during KYC and pass it
| here — your current userSchema doesn't have a bvn field yet.
*/
async function createReservedAccount({ accountReference, name, email, phone, bvn }) {
    try {

        const token = await getToken();

        const payload = {
            accountReference,
            accountName: name,
            currencyCode: "NGN",
            contractCode: CONTRACT_CODE,
            customerEmail: email,
            customerName: name,
            getAllAvailableBanks: true,
        };

        if (phone) payload.customerPhoneNumber = phone;
        if (bvn) payload.bvn = bvn;

        const { data } = await api.post(
            "/api/v2/bank-transfer/reserved-accounts",
            payload,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!data.requestSuccessful) {
            throw new Error(data.responseMessage || "Unable to create reserved account");
        }

        return data.responseBody;
        // Shape: { accountReference, accountName, currencyCode,
        //          accounts: [{ bankCode, bankName, accountNumber }, ...] }

    } catch (err) {
        if (err.response?.data) {
            throw new Error(err.response.data.responseMessage || "Monnify error");
        }
        throw new Error(err.message);
    }
}

/*
|--------------------------------------------------------------------------
| VERIFY WEBHOOK SIGNATURE
|--------------------------------------------------------------------------
| Monnify signs each webhook body with HMAC-SHA512 using your Secret Key,
| sent in the `monnify-signature` header. NEVER trust a webhook payload
| you haven't verified — anyone could POST a fake "successful payment"
| event to your endpoint otherwise.
|
| rawBody must be the exact raw request bytes (Buffer), not a parsed/
| re-serialized JSON object — re-serializing can subtly change byte
| ordering/whitespace and break the signature check.
*/
function verifyWebhookSignature(rawBody, signatureHeader) {
    if (!signatureHeader) return false;

    const computed = crypto
        .createHmac("sha512", SECRET_KEY)
        .update(rawBody)
        .digest("hex");

    // Constant-time comparison to avoid timing attacks
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(signatureHeader, "hex");

    if (a.length !== b.length) return false;

    return crypto.timingSafeEqual(a, b);
}

module.exports = {
    getToken,
    createReservedAccount,
    verifyWebhookSignature,
};