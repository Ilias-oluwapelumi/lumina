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
    console.log('=== HeedPay Debug ===');
    console.log('API Key:', apiKey?.substring(0, 20) + '...');
    console.log('RefId:', refId);
    
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

    console.log('Payload:', JSON.stringify(payload, null, 2));

    // Create fresh axios instance with full config
    const api = axios.create({
      baseURL: 'https://heedpay.com.ng/api',
      timeout: 30000,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    const response = await api.post('/create-virtual-account', payload);
    const data = response.data;

    console.log('HeedPay Response:', JSON.stringify(data, null, 2));

    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message || 'Failed to create virtual account');
  } catch (err) {
    console.error('HeedPay Status:', err.response?.status);
    console.error('HeedPay Headers Sent:', err.config?.headers);
    console.error('HeedPay Error:', JSON.stringify(err.response?.data, null, 2));
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = {
  createVirtualAccount,
};