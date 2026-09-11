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
    console.log('Creating Virtual Account with HeedPay...');
    
    const { data } = await api.post('/create-virtual-account', {
      refId,
      email,
      account_name: accountName,
      phone_number: phoneNumber,
      identityType: 'bvn',
      identityNumber: bvn,
      account_type: 'STATIC',
      bankCode: 'palmpay',
      businessId,
    }, {
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    console.log('HeedPay Response:', JSON.stringify(data));

    if (data.status === 'success') {
      return data.data;
    }
    throw new Error(data.message || 'Failed to create virtual account');
  } catch (err) {
    console.error('HeedPay Error:', err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message);
  }
}

module.exports = {
  createVirtualAccount,
};