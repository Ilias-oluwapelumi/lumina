const db = require('../config/db');
const mongoose = require('mongoose');
const User = () => mongoose.model('User'); // Helper matching your project architecture

exports.heedpayWebhook = async (req, res) => {
  try {
    const eventType = req.body.eventType;
    const paymentData = req.body.data || {};
    const customerData = req.body.customer || {};

    const amount_credited = paymentData.amount_credited;
    const reference = paymentData.reference;
    const accountNumber = customerData.account;

    console.log('=================================');
    console.log('HeedPay Webhook Received');
    console.log('Event Type:', eventType);
    console.log('Amount Credited:', amount_credited);
    console.log('Reference:', reference);
    console.log('Account Number:', accountNumber);
    console.log('Full Data:', JSON.stringify(req.body));
    console.log('=================================');

    if (!amount_credited || !reference || !accountNumber) {
      console.log('⚠️ Missing amount_credited, reference, or account number');
      return res.json({ success: true });
    }

    const transferAmount = parseFloat(amount_credited);
    if (transferAmount <= 0) {
      return res.json({ success: true });
    }

    // Find user by virtual account number using your dynamic model function
    const user = await User().findOne({
      'virtualAccount.accountNumber': accountNumber, 
    }).lean();

    if (!user) {
      console.log('❌ User not found for account number:', accountNumber);
      return res.json({ success: true });
    }

    const userId = user.id || user._id;

    // Check if already processed
    const existing = await db.getTransactionByReference(reference);
    if (existing && existing.status === 'successful') {
      console.log('✓ Transaction already processed');
      return res.json({ success: true });
    }

    // Credit wallet
    const wallet = await db.creditWallet(userId, transferAmount);
    console.log(`✅ Credited ₦${transferAmount} to user ${userId}`);

    // Create transaction record
    await db.createTransaction({
      userId,
      type: 'credit',
      category: 'fund',
      title: 'Wallet Funding via HeedPay',
      amount: transferAmount,
      status: 'successful',
      icon: 'account_balance',
      reference,
      meta: { source: 'heedpay', session_id: paymentData.session_id },
    });

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};