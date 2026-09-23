const db = require('../config/db');

exports.heedpayWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const { event_type, data = {} } = payload;

    // Resolve refId from top-level payload OR inner data object
    const refId = payload.refId || data.refId || data.reference;

    console.log('=================================');
    console.log('HeedPay Webhook Received');
    console.log('Event:', event_type);
    console.log('Reference:', refId);
    console.log('Data:', JSON.stringify(data));
    console.log('=================================');

    // Filter payment credit events
    if (
      event_type === 'RESERVED_VIRTUAL_ACCOUNT_CREDITED' ||
      event_type === 'PAYMENT_RECEIVED' ||
      event_type === 'SUCCESSFUL'
    ) {
      // Determine credited amount
      const transferAmount = parseFloat(data.creditAmount || data.amount || 0);

      if (!transferAmount || transferAmount <= 0) {
        console.log('⚠️ No valid credit amount found in payload');
        return res.status(200).json({ success: false, message: 'No valid amount found' });
      }

      if (!refId) {
        console.log('⚠️ No reference ID found in payload');
        return res.status(200).json({ success: false, message: 'No reference ID provided' });
      }

      // Find user by virtual account refId
      // Ensure 'User' model is properly exported from your db/config file
      const user = await db.User.findOne({
        'virtualAccount.refId': refId,
      }).lean();

      if (!user) {
        console.log('⚠️ User not found for refId:', refId);
        return res.status(200).json({ success: false, message: 'User not found' });
      }

      const userId = user._id || user.id;

      // Idempotency check: check if reference has already been processed
      const existing = await db.getTransactionByReference(refId);
      if (existing && (existing.status === 'successful' || existing.status === 'success')) {
        console.log('ℹ️ Transaction already processed:', refId);
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      // Credit user wallet
      await db.creditWallet(userId, transferAmount);
      console.log(`✅ Credited ₦${transferAmount} to user ${userId}`);

      // Record transaction log
      await db.createTransaction({
        userId,
        type: 'credit',
        category: 'fund',
        title: 'Wallet Funding via HeedPay',
        amount: transferAmount,
        status: 'successful',
        icon: 'account_balance',
        reference: refId,
        meta: { source: 'heedpay', rawEvent: event_type },
      });
    }

    // Always acknowledge receipt to HeedPay with 200 OK
    return res.status(200).json({ success: true, message: 'Webhook processed successfully' });

  } catch (err) {
    console.error('❌ Webhook Processing Error:', err.message);
    // Returning 200 with error details prevents repeated gateway failover during development
    return res.status(200).json({ success: false, message: err.message });
  }
};