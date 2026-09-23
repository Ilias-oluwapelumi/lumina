const db = require('../config/db');

exports.heedpayWebhook = async (req, res) => {
  try {
    const { eventType, status, data } = req.body;

    console.log('=================================');
    console.log('HeedPay Webhook Received');
    console.log('Event Type:', eventType);
    console.log('Status:', status);
    console.log('Data:', JSON.stringify(data));
    console.log('=================================');

    // Verify it's a successful virtual deposit
    if (eventType !== 'VIRTUAL_DEPOSIT' || status !== 'success' || !data) {
      console.log('⚠️ Invalid event type or status');
      return res.json({ success: true });
    }

    const { amount_credited, reference } = data;
    const transferAmount = parseFloat(amount_credited);

    if (!transferAmount || !reference) {
      console.log('⚠️ Missing amount_credited or reference');
      return res.json({ success: true });
    }

    if (transferAmount <= 0) {
      return res.json({ success: true });
    }

    // Find user by virtual account refId
    const user = await require('../config/db').User.findOne({
      'virtualAccount.refId': reference,
    }).lean();

    if (!user) {
      console.log('❌ User not found for reference:', reference);
      return res.json({ success: true });
    }

    const userId = user.id;

    // Check if already processed
    const existing = await db.getTransactionByReference(reference);
    if (existing && existing.status === 'successful') {
      console.log('✓ Transaction already processed');
      return res.json({ success: true });
    }

    // Credit wallet
    const wallet = await db.creditWallet(userId, transferAmount);
    console.log(`✅ Credited ₦${transferAmount} to user ${userId}`);

    // Create transaction
    await db.createTransaction({
      userId,
      type: 'credit',
      category: 'fund',
      title: 'Wallet Funding via HeedPay',
      amount: transferAmount,
      status: 'successful',
      icon: 'account_balance',
      reference,
      meta: { source: 'heedpay' },
    });

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};