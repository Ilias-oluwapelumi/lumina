const axios = require('axios');

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
    const refId = generateRefId();

    // Clean the key and ensure it starts precisely with 'heedpay'
    const cleanKey = apiKey ? apiKey.trim() : '';
    const authHeader = cleanKey.startsWith('heedpay') ? cleanKey : `heedpay${cleanKey}`;

    console.log('=== HeedPay Static Account Request ===');
    console.log('URL: https://heedpay.com.ng/api/create-virtual-account');
    console.log('Auth Header Preview:', authHeader.substring(0, 20) + '...');

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
          'Authorization': authHeader,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('Response:', JSON.stringify(data));
    
    if (data.status === 'success') {
      return data.data; // Returning the nested data object containing virtualNumber/bankName
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
  createVirtualAccount 
};