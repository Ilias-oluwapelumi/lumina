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

    console.log('Payload:', JSON.stringify(payload));

    const { data } = await axios({
      method: 'POST',
      url: 'https://heedpay.com.ng/api/create-virtual-account',
      data: payload,
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    console.log('HeedPay Response:', JSON.stringify(data));

    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message || 'Failed');
  } catch (err) {
    console.error('HeedPay Error:', err.response?.data?.message || err.message);
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = { createVirtualAccount };