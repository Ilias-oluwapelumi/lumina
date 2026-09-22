const axios = require('axios');

/**
 * Generate a valid HeedPay refId.
 *
 * Format:
 * YYYYMMDD + 12 random characters
 *
 * Example:
 * 20260922A8K92LMN4PQR
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

  return `${datePrefix}${randomPart}`;
}

/**
 * Provision HeedPay Static Virtual Account
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
    console.log('HEEDPAY STATIC ACCOUNT REQUEST');
    console.log('========================================');

    /**
     * Clean API key
     */
    const authHeader = apiKey ? String(apiKey).trim() : '';

    /**
     * DEBUG AUTH HEADER
     *
     * We do NOT print the full API key for security.
     */
    console.log('API key received:', apiKey ? 'YES' : 'NO');
    console.log('Authorization header exists:', authHeader ? 'YES' : 'NO');
    console.log('Authorization header length:', authHeader.length);

    if (authHeader) {
      const maskedKey =
        authHeader.length > 10
          ? `${authHeader.substring(0, 6)}********${authHeader.substring(
              authHeader.length - 4
            )}`
          : '********';

      console.log('Authorization header:', maskedKey);
    } else {
      console.log('Authorization header: EMPTY');
    }

    /**
     * Validate API key
     */
    if (!authHeader) {
      throw new Error(
        'HeedPay API key is missing. Please check HEEDPAY_API_KEY.'
      );
    }

    /**
     * Validate business ID
     */
    if (!businessId) {
      throw new Error(
        'HeedPay businessId is missing. Please check HEEDPAY_BUSINESS_ID.'
      );
    }

    /**
     * Generate unique reference ID
     */
    const refId = generateRefId();

    console.log('refId:', refId);
    console.log('email:', email);
    console.log('account name:', accountName);
    console.log('phone number:', phoneNumber);
    console.log('identity type:', identityType);
    console.log('bank code:', bankCode);
    console.log('business ID:', businessId);

    /**
     * Request payload
     */
    const payload = {
      refId,
      email,
      account_name: accountName,
      phone_number: phoneNumber,
      identityType,
      identityNumber,
      account_type: 'STATIC',
      bankCode,
      businessId,
    };

    console.log('Request payload:', JSON.stringify(payload));

    /**
     * HeedPay API
     */
    const url =
      'https://heedpay.com.ng/api/create-virtual-account';

    console.log('Request URL:', url);

    /**
     * Send request
     */
    const response = await axios.post(
      url,
      payload,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        timeout: 30000,
      }
    );

    const data = response.data;

    console.log('========================================');
    console.log('HEEDPAY RESPONSE');
    console.log('========================================');

    console.log('HTTP Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    /**
     * Check successful response
     */
    if (data && data.status === 'success') {
      console.log('Virtual account created successfully.');

      /**
       * Return the account data
       */
      return data.data;
    }

    /**
     * HeedPay returned an error
     */
    throw new Error(
      data?.message || 'Failed to create static virtual account'
    );

  } catch (err) {
    console.error('========================================');
    console.error('HEEDPAY ERROR');
    console.error('========================================');

    console.error('Error message:', err.message);

    if (err.response) {
      console.error('HTTP status:', err.response.status);

      console.error(
        'HeedPay response:',
        JSON.stringify(err.response.data, null, 2)
      );
    } else if (err.request) {
      console.error(
        'No response received from HeedPay.'
      );
    }

    /**
     * Extract the actual HeedPay error message
     */
    const heedPayMessage =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      'Failed to create virtual account';

    throw new Error(heedPayMessage);
  }
}

/**
 * Export functions
 */
module.exports = {
  generateRefId,
  createVirtualAccount,
};