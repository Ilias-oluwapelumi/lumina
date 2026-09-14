const axios = require('axios');

async function createVirtualAccount({
  refId,
  email,
  accountName,
  phoneNumber,
  bvn,
  businessId,
  apiKey,
}) {
  try {
    console.log('=== HeedPay Request ===');
    console.log('API Key (first 20):', apiKey?.substring(0, 20));
    console.log('URL: https://heedpay.com.ng/api/create-virtual-account');
    
    const payload = {
      refId,
      email,
      account_name: accountName,
      phone_number: phoneNumber,
      identityType: 'bvn',
      identityNumber: bvn,
      account_type: 'STATIC',
      bankCode: 'palmpay',
      businessId,
    };

    const { data } = await axios.post(
      'https://heedpay.com.ng/api/create-virtual-account',
      payload,
      {
        headers: {
          // Added 'Bearer ' prefix to fix "Invalid Access Token"
          'Authorization': apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log('Response:', JSON.stringify(data));
    if (data.status === 'success' || data.status === true) {
      return data.data;
    }
    throw new Error(data.message || 'Failed');
  } catch (err) {
    console.error('Full Error:', err.message);
    console.error('Status:', err.response?.status);
    console.error('Response Data:', err.response?.data);
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = { createVirtualAccount };