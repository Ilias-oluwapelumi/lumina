const db = require('../config/db');         // ← one ../
const vtpass = require('../services/vtpass'); // ← one ../

// POST /api/services/airtime
exports.buyAirtime = async (req, res) => {
  try {
    const { network, phone, amount } = req.body;
    if (!network || !phone || !amount || amount < 50) {
      return res.status(400).json({ success: false, message: 'Network, phone and amount (min ₦50) required' });
    }
    await vtpass.buyAirtime({ network, phone, amount: parseFloat(amount) });
    const wallet = await db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `AIR${Date.now()}`;
    const txn = await db.createTransaction({
      userId: req.user.id, type: 'debit', category: 'airtime',
      title: `Airtime – ${network}`, amount: parseFloat(amount),
      status: 'successful', icon: 'phone_android', reference: ref,
      meta: { network, phone },
    });
    res.json({ success: true, message: `₦${Number(amount).toLocaleString()} airtime sent to ${phone}`, data: { wallet, transaction: txn, reference: ref } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/services/data/plans
exports.getDataPlans = async (req, res) => {
  try {
    const { network } = req.query;
    const plans = await vtpass.getDataPlans(network);
    res.json({ success: true, data: { network, plans } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/services/data
exports.buyData = async (req, res) => {
  try {
    const { network, phone, planId } = req.body;
    const plans = await vtpass.getDataPlans(network);
    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid data plan' });
    await vtpass.buyData({ network, phone, planId, amount: plan.price });
    const wallet = await db.debitWallet(req.user.id, plan.price);
    const ref = `DATA${Date.now()}`;
    const txn = await db.createTransaction({
      userId: req.user.id, type: 'debit', category: 'data',
      title: `Data – ${network} ${plan.name}`, amount: plan.price,
      status: 'successful', icon: 'wifi', reference: ref,
      meta: { network, phone, plan },
    });
    res.json({ success: true, message: `${plan.name} data sent to ${phone}`, data: { wallet, transaction: txn, reference: ref } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/services/electricity/verify
exports.verifyMeter = async (req, res) => {
  try {
    const { meterNumber, disco, meterType } = req.body;
    if (!meterNumber || !disco) return res.status(400).json({ success: false, message: 'Meter number and DISCO required' });
    const result = await vtpass.verifyMeter({ meterNumber, disco, meterType });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/services/electricity/pay
exports.payElectricity = async (req, res) => {
  try {
    const { meterNumber, disco, meterType, amount, phone } = req.body;
    if (!meterNumber || !disco || !amount || amount < 500) {
      return res.status(400).json({ success: false, message: 'All fields required. Minimum ₦500' });
    }
    const result = await vtpass.payElectricity({ meterNumber, disco, meterType, amount: parseFloat(amount), phone: phone || req.user.phone });
    const wallet = await db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `ELEC${Date.now()}`;
    const txn = await db.createTransaction({
      userId: req.user.id, type: 'debit', category: 'electricity',
      title: `${disco} – ${meterType}`, amount: parseFloat(amount),
      status: 'successful', icon: 'bolt', reference: ref,
      meta: { meterNumber, disco, meterType, token: result.token },
    });
    res.json({ success: true, message: `Token: ${result.token}. ₦${Number(amount).toLocaleString()} paid to ${disco}`, data: { wallet, transaction: txn, token: result.token, reference: ref } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/services/cable/plans
exports.getCablePlans = async (req, res) => {
  try {
    const { provider } = req.query;
    const plans = await vtpass.getCablePlans(provider);
    res.json({ success: true, data: { provider, plans } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/services/cable/verify
exports.verifyCableCard = async (req, res) => {
  try {
    const { smartCardNumber, provider } = req.body;
    if (!smartCardNumber || !provider) return res.status(400).json({ success: false, message: 'Smart card number and provider required' });
    const result = await vtpass.verifyCableCard({ smartCardNumber, provider });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/services/cable/subscribe
exports.subscribeCable = async (req, res) => {
  try {
    const { smartCardNumber, provider, planId } = req.body;
    const plans = await vtpass.getCablePlans(provider);
    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });
    await vtpass.subscribeCable({ smartCardNumber, provider, planId, amount: plan.price, phone: req.user.phone });
    const wallet = await db.debitWallet(req.user.id, plan.price);
    const ref = `CABLE${Date.now()}`;
    const txn = await db.createTransaction({
      userId: req.user.id, type: 'debit', category: 'cable',
      title: `${provider} ${plan.name}`, amount: plan.price,
      status: 'successful', icon: 'tv', reference: ref,
      meta: { smartCardNumber, provider, plan },
    });
    res.json({ success: true, message: `${provider} ${plan.name} subscription renewed!`, data: { wallet, transaction: txn, reference: ref } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};