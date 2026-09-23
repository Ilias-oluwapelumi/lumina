const db = require('../config/db');

/**
 * Handle incoming webhooks from HeedPay
 */
exports.heedpayWebhook = async (req, res) => {
  try {
    const payload = req.body || {};
    const { event_type, event, status, data = {} } = payload;

    // Resolve event identifier across variations
    const currentEvent = event_type || event || status || '';

    // Resolve reference ID across different possible payload keys
    const refId = payload.refId || data.refId || data.reference || payload.reference;

    console.log('=================================');
    console.log('HeedPay Webhook Received');
    console.log('Event Type:', currentEvent);
    console.log('Reference ID:', refId);
    console.log('Data Object:', JSON.stringify(data));
    console.log('=================================');

    // Process payment credit events
    if (
      currentEvent === 'RESERVED_VIRTUAL_ACCOUNT_CREDITED' ||
      currentEvent === 'PAYMENT_RECEIVED' ||
      currentEvent === 'SUCCESSFUL' ||
      currentEvent === 'success'
    ) {
      // Determine credit amount from payload
      const transferAmount = parseFloat(data.creditAmount || data.amount || payload.amount || 0);

      if (!transferAmount || transferAmount <= 0) {
        console.log('⚠️ Webhook ignored: No valid credit amount found');
        return res.status(200).json({ success: false, message: 'No valid amount found' });
      }

      if (!refId) {
        console.log('⚠️ Webhook ignored: No reference ID found in payload');
        return res.status(200).json({ success: false, message: 'No reference ID provided' });
      }

      // Find user by virtual account refId using the db model
      let user = null;
      if (db.User && typeof db.User.findOne === 'function') {
        user = await db.User.findOne({ 'virtualAccount.refId': refId }).lean();
      } else if (typeof db.getUserByRefId === 'function') {
        user = await db.getUserByRefId(refId);
      }

      if (!user) {
        console.log('⚠️ Webhook ignored: User not found for refId:', refId);
        return res.status(200).json({ success: false, message: 'User not found for refId' });
      }

      const userId = user._id || user.id;

      // Check if transaction has already been processed
      if (typeof db.getTransactionByReference === 'function') {
        const existing = await db.getTransactionByReference(refId);
        if (existing && (existing.status === 'successful' || existing.status === 'success')) {
          console.log('ℹ️ Webhook ignored: Transaction already processed:', refId);
          return res.status(200).json({ success: true, message: 'Already processed' });
        }
      }

      // Credit wallet
      if (typeof db.creditWallet === 'function') {
        await db.creditWallet(userId, transferAmount);
        console.log(`✅ Credited ₦${transferAmount} to user ID: ${userId}`);
      }

      // Create transaction log
      if (typeof db.createTransaction === 'function') {
        await db.createTransaction({
          userId,
          type: 'credit',
          category: 'fund',
          title: 'Wallet Funding via HeedPay',
          amount: transferAmount,
          status: 'successful',
          icon: 'account_balance',
          reference: refId,
          meta: { source: 'heedpay', rawEvent: currentEvent },
        });
        console.log(`✅ Created transaction log for reference: ${refId}`);
      }
    }

    // Always acknowledge receipt to HeedPay with HTTP 200 OK
    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });

  } catch (err) {
    console.error('❌ Webhook Controller Error:', err.message);
    // Returning 200 prevents gateway retries from flooding the server during error debugging
    return res.status(200).json({
      success: false,
      message: err.message,
    });
  }
};