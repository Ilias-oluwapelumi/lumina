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
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return datePrefix + randomPart;
}

/**
 * Provision Static Virtual Account
 */
async function createStaticVirtualAccount({
  email,
  accountName,
  phoneNumber,
  identityType = 'bvn', // Supported values: "bvn" or "nin"
  identityNumber,
  bankCode = 'palmpay', // Target clearing institute routing code
  businessId,
  apiKey,
}) {
  try {
    const refId = generateRefId();

    console.log('=== HeedPay Static Account Request ===');
    console.log('URL: https://heedpay.com.ng/api/create-virtual-account');

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

    const { data } = await axios.post(
      'https://heedpay.com.ng/api/create-virtual-account',
      payload,
      {
        headers: {
          // Based on HeedPay documentation header example (Authorization: heedpay...)
          'Authorization': apiKey.startsWith('heedpay') ? apiKey : `heedpay${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('Response:', JSON.stringify(data));
    
    if (data.status === 'success') {
      return data; // Contains virtualNumber, virtualName, bankName, etc. inside data object
    }
    throw new Error(data.message || 'Failed to create static virtual account');
  } catch (err) {
    console.error('Full Error:', err.message);
    console.error('Status:', err.response?.status);
    console.error('Response Data:', err.response?.data);
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = { 
  generateRefId, 
  createStaticVirtualAccount 
};