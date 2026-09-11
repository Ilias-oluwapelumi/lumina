const db = require('../config/db');

exports.heedpayWebhook = async (req, res) => {
  try {
    const { event_type, data, refId } = req.body;

    console.log('=================================');
    console.log('HeedPay Webhook Received');
    console.log('Event:', event_type);
    console.log('Data:', JSON.stringify(data));
    console.log('=================================');

    // When payment is credited to account
    if (event_type === 'RESERVED_VIRTUAL_ACCOUNT_CREDITED' || 
        event_type === 'PAYMENT_RECEIVED') {
      
      const { amount, creditAmount } = data;
      const transferAmount = parseFloat(amount || creditAmount || 0);

      if (!transferAmount) {
        return res.json({ success: false, message: 'No amount found' });
      }

      // Find user by refId
      const user = await require('../config/db').User.findOne({
        'virtualAccount.refId': refId,
      }).lean();

      if (!user) {
        console.log('User not found for refId:', refId);
        return res.json({ success: false, message: 'User not found' });
      }

      const userId = user.id;

      // Check if already credited
      const existing = await db.getTransactionByReference(refId);
      if (existing && existing.status === 'successful') {
        console.log('Transaction already processed');
        return res.json({ success: true, message: 'Already processed' });
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
        reference: refId,
        meta: { source: 'heedpay' },
      });
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};