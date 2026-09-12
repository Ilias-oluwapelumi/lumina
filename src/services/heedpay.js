const axios = require('axios');

const api = axios.create({
  baseURL: 'https://heedpay.com.ng/api',
});

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
    console.log('API Key:', apiKey?.substring(0, 10) + '...');
    console.log('RefId:', refId);
    console.log('RefId Length:', refId.length);
    console.log('RefId starts with YYYYMMDD:', /^\d{8}/.test(refId));
    
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

    const { data } = await api.post('/create-virtual-account', payload, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('HeedPay Response:', JSON.stringify(data, null, 2));

    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message || 'Failed to create virtual account');
  } catch (err) {
    console.error('HeedPay Error Status:', err.response?.status);
    console.error('HeedPay Error Data:', JSON.stringify(err.response?.data, null, 2));
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = {
  createVirtualAccount,
};