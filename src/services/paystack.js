const https = require('https');

const paystackRequest = (method, path, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.paystack.co',
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

// Initialize a payment
exports.initializePayment = async ({ email, amount, reference, callbackUrl }) => {
  const data = await paystackRequest('POST', '/transaction/initialize', {
    email,
    amount: Math.round(amount * 100), // Paystack uses kobo
    reference,
    callback_url: callbackUrl || `${process.env.FRONTEND_URL}/payment/callback`,
    metadata: { custom_fields: [{ display_name: 'App', value: 'Lumina' }] },
  });
  if (!data.status) throw new Error(data.message || 'Payment initialization failed');
  return {
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
    reference: data.data.reference,
  };
};

// Verify a payment
exports.verifyPayment = async (reference) => {
  const data = await paystackRequest('GET', `/transaction/verify/${reference}`);
  if (!data.status) throw new Error(data.message || 'Payment verification failed');
  return {
    status: data.data.status, // 'success', 'failed', 'abandoned'
    amount: data.data.amount / 100, // convert back from kobo
    reference: data.data.reference,
    email: data.data.customer.email,
  };
};