const db = require('../../config/db');

// ─── DATA CATALOG ─────────────────────────────────────────────────────────────

const DATA_PLANS = {
  MTN: [
    { id: 'mtn-1', name: '1GB', validity: '1 Day', price: 300 },
    { id: 'mtn-2', name: '2GB', validity: '3 Days', price: 500 },
    { id: 'mtn-3', name: '5GB', validity: '30 Days', price: 1500 },
    { id: 'mtn-4', name: '10GB', validity: '30 Days', price: 2500 },
    { id: 'mtn-5', name: '20GB', validity: '30 Days', price: 4000 },
    { id: 'mtn-6', name: '50GB', validity: '30 Days', price: 8000 },
    { id: 'mtn-7', name: '100GB', validity: '30 Days', price: 15000 },
  ],
  Airtel: [
    { id: 'atl-1', name: '750MB', validity: '1 Day', price: 200 },
    { id: 'atl-2', name: '1.5GB', validity: '7 Days', price: 500 },
    { id: 'atl-3', name: '3GB', validity: '30 Days', price: 1000 },
    { id: 'atl-4', name: '10GB', validity: '30 Days', price: 2000 },
    { id: 'atl-5', name: '25GB', validity: '30 Days', price: 4500 },
    { id: 'atl-6', name: '50GB', validity: '30 Days', price: 7000 },
  ],
  Glo: [
    { id: 'glo-1', name: '1GB', validity: '3 Days', price: 300 },
    { id: 'glo-2', name: '2GB', validity: '14 Days', price: 500 },
    { id: 'glo-3', name: '5GB', validity: '30 Days', price: 1200 },
    { id: 'glo-4', name: '10GB', validity: '30 Days', price: 2000 },
    { id: 'glo-5', name: '50GB', validity: '30 Days', price: 7000 },
  ],
  '9Mobile': [
    { id: '9mb-1', name: '500MB', validity: '1 Day', price: 150 },
    { id: '9mb-2', name: '1GB', validity: '7 Days', price: 400 },
    { id: '9mb-3', name: '3GB', validity: '30 Days', price: 1000 },
    { id: '9mb-4', name: '10GB', validity: '30 Days', price: 2500 },
  ],
};

const CABLE_PLANS = {
  DSTV: [
    { id: 'dstv-1', name: 'Padi', price: 2950 },
    { id: 'dstv-2', name: 'Yanga', price: 4565 },
    { id: 'dstv-3', name: 'Confam', price: 9300 },
    { id: 'dstv-4', name: 'Compact', price: 15700 },
    { id: 'dstv-5', name: 'Compact Plus', price: 25000 },
    { id: 'dstv-6', name: 'Premium', price: 37000 },
  ],
  GOtv: [
    { id: 'gotv-1', name: 'Smallie', price: 1575 },
    { id: 'gotv-2', name: 'Jinja', price: 2715 },
    { id: 'gotv-3', name: 'Jolli', price: 4115 },
    { id: 'gotv-4', name: 'Max', price: 6200 },
    { id: 'gotv-5', name: 'Supa', price: 9150 },
  ],
  StarTimes: [
    { id: 'star-1', name: 'Nova', price: 900 },
    { id: 'star-2', name: 'Basic', price: 1700 },
    { id: 'star-3', name: 'Smart', price: 2600 },
    { id: 'star-4', name: 'Classic', price: 3800 },
    { id: 'star-5', name: 'Super', price: 6200 },
  ],
};

const DISCOS = ['IKEDC', 'EKEDC', 'AEDC', 'PHED', 'IBEDC', 'KEDCO', 'JEDC', 'BEDC'];

// ─── AIRTIME ──────────────────────────────────────────────────────────────────

// GET /api/services/networks
exports.getNetworks = (_req, res) => {
  res.json({
    success: true,
    data: { networks: ['MTN', 'Airtel', 'Glo', '9Mobile'] },
  });
};

// POST /api/services/airtime
exports.buyAirtime = (req, res) => {
  try {
    const { network, phone, amount } = req.body;
    if (!network || !phone || !amount || amount < 50) {
      return res.status(400).json({ success: false, message: 'Network, phone and amount (min ₦50) required' });
    }
    const wallet = db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `AIR${Date.now()}`;
    const txn = db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'airtime',
      title: `Airtime – ${network}`,
      amount: parseFloat(amount),
      status: 'successful',
      icon: 'phone_android',
      reference: ref,
      meta: { network, phone },
    });
    res.json({
      success: true,
      message: `₦${Number(amount).toLocaleString()} airtime sent to ${phone}`,
      data: { wallet, transaction: txn, reference: ref },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── DATA ─────────────────────────────────────────────────────────────────────

// GET /api/services/data/plans?network=MTN
exports.getDataPlans = (req, res) => {
  const { network } = req.query;
  const plans = DATA_PLANS[network];
  if (!plans) {
    return res.status(400).json({ success: false, message: 'Invalid network' });
  }
  res.json({ success: true, data: { network, plans } });
};

// POST /api/services/data
exports.buyData = (req, res) => {
  try {
    const { network, phone, planId } = req.body;
    const plans = DATA_PLANS[network] || [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid data plan' });

    const wallet = db.debitWallet(req.user.id, plan.price);
    const ref = `DATA${Date.now()}`;
    const txn = db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'data',
      title: `Data – ${network} ${plan.name}`,
      amount: plan.price,
      status: 'successful',
      icon: 'wifi',
      reference: ref,
      meta: { network, phone, plan },
    });
    res.json({
      success: true,
      message: `${plan.name} data sent to ${phone}`,
      data: { wallet, transaction: txn, reference: ref },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── ELECTRICITY ──────────────────────────────────────────────────────────────

// GET /api/services/electricity/discos
exports.getDiscos = (_req, res) => {
  res.json({ success: true, data: { discos: DISCOS } });
};

// POST /api/services/electricity/verify
exports.verifyMeter = (req, res) => {
  const { meterNumber, disco, meterType } = req.body;
  if (!meterNumber || !disco) {
    return res.status(400).json({ success: false, message: 'Meter number and DISCO required' });
  }
  // In production: call VTU provider API to verify meter
  res.json({
    success: true,
    data: {
      meterNumber,
      customerName: 'OLUWASEUN ADEYEMI',
      address: '12, Akin Close, Lekki Phase 1, Lagos',
      disco,
      meterType: meterType || 'Prepaid',
      minimumAmount: 500,
    },
  });
};

// POST /api/services/electricity/pay
exports.payElectricity = (req, res) => {
  try {
    const { meterNumber, disco, meterType, amount } = req.body;
    if (!meterNumber || !disco || !amount || amount < 500) {
      return res.status(400).json({ success: false, message: 'All fields required. Minimum ₦500' });
    }
    const wallet = db.debitWallet(req.user.id, parseFloat(amount));
    const token = Array.from({ length: 4 }, () =>
      Math.floor(1000 + Math.random() * 9000)).join('-');
    const ref = `ELEC${Date.now()}`;
    const txn = db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'electricity',
      title: `${disco} – ${meterType}`,
      amount: parseFloat(amount),
      status: 'successful',
      icon: 'bolt',
      reference: ref,
      meta: { meterNumber, disco, meterType, token },
    });
    res.json({
      success: true,
      message: `Token: ${token}. ₦${Number(amount).toLocaleString()} paid to ${disco}`,
      data: { wallet, transaction: txn, token, reference: ref },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ─── CABLE TV ─────────────────────────────────────────────────────────────────

// GET /api/services/cable/plans?provider=DSTV
exports.getCablePlans = (req, res) => {
  const { provider } = req.query;
  const plans = CABLE_PLANS[provider];
  if (!plans) return res.status(400).json({ success: false, message: 'Invalid provider' });
  res.json({ success: true, data: { provider, plans } });
};

// POST /api/services/cable/verify
exports.verifyCableCard = (req, res) => {
  const { smartCardNumber, provider } = req.body;
  if (!smartCardNumber || !provider) {
    return res.status(400).json({ success: false, message: 'Smart card number and provider required' });
  }
  // Production: call VTU provider to verify card
  res.json({
    success: true,
    data: {
      smartCardNumber,
      customerName: 'TOBI JOHNSON',
      currentBouquet: `${provider} Compact`,
      provider,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  });
};

// POST /api/services/cable/subscribe
exports.subscribeCable = (req, res) => {
  try {
    const { smartCardNumber, provider, planId } = req.body;
    const plans = CABLE_PLANS[provider] || [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) return res.status(400).json({ success: false, message: 'Invalid plan' });

    const wallet = db.debitWallet(req.user.id, plan.price);
    const ref = `CABLE${Date.now()}`;
    const txn = db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'cable',
      title: `${provider} ${plan.name}`,
      amount: plan.price,
      status: 'successful',
      icon: 'tv',
      reference: ref,
      meta: { smartCardNumber, provider, plan },
    });
    res.json({
      success: true,
      message: `${provider} ${plan.name} subscription renewed successfully!`,
      data: { wallet, transaction: txn, reference: ref },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
