const db = require('../config/db');

exports.heedpayWebhook = async (req, res) => {
  try {
    const { event_type, data } = req.body;

    console.log('=================================');
    console.log('HeedPay Webhook Received');
    console.log('Event Type:', event_type);
    console.log('Data Object:', JSON.stringify(data));
    console.log('=================================');

    // Check if this is a credit event
    if (event_type === 'success' && data) {
      const { amount_credited, reference } = data;
      const transferAmount = parseFloat(amount_credited || 0);

      if (!transferAmount || transferAmount <= 0) {
        console.log('⚠️ No valid credit amount found');
        return res.json({ success: true, message: 'No credit amount' });
      }

      // Find user by virtual account refId
      const user = await require('../config/db').User.findOne({
        'virtualAccount.refId': reference,
      }).lean();

      if (!user) {
        console.log('User not found for reference:', reference);
        return res.json({ success: true });
      }

      const userId = user.id;

      // Check if already processed
      const existing = await db.getTransactionByReference(reference);
      if (existing && existing.status === 'successful') {
        console.log('Transaction already processed');
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
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};