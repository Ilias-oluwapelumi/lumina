const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// ─── CONNECT TO MONGODB ──────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ─── SCHEMAS ─────────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  id: { type: String, default: () => uuidv4(), unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },

  transactionPin: {
    type: String,
    default: null,
  },

  pinAttempts: {
    type: Number,
    default: 0,
  },

  pinLockedUntil: {
    type: Date,
    default: null,
  },

  kycTier: { type: Number, default: 1 },
  kycVerified: { type: Boolean, default: false },
  avatarUrl: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const walletSchema = new mongoose.Schema({
  userId:        { type: String, required: true, unique: true },
  balance:       { type: Number, default: 0 },
  accountNumber: { type: String },
  bankName:      { type: String, default: 'Lumina Bank' },
});

const transactionSchema = new mongoose.Schema({
  id:        { type: String, default: () => uuidv4(), unique: true },
  userId:    { type: String, required: true },
  type:      { type: String },
  category:  { type: String },
  title:     { type: String },
  amount:    { type: Number },
  status:    { type: String },
  icon:      { type: String },
  date:      { type: String, default: () => new Date().toISOString() },
  reference: { type: String },
  meta:      { type: mongoose.Schema.Types.Mixed },
});

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
});

const User         = mongoose.models.User         || mongoose.model('User', userSchema);
const Wallet       = mongoose.models.Wallet       || mongoose.model('Wallet', walletSchema);
const Transaction  = mongoose.models.Transaction  || mongoose.model('Transaction', transactionSchema);
const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);

// ─── SEED DEMO USER ──────────────────────────────────────────────────────────
async function seed() {
  const exists = await User.findOne({ phone: '08012345678' });
  if (exists) return;
  const id = 'demo-user-001';
  const passwordHash = await bcrypt.hash('password123', 10);
  await User.create({
    id, fullName: 'Tobi Johnson', email: 'tobi@lumina.ng',
    phone: '08012345678', passwordHash, kycTier: 3, kycVerified: true,
  });
  await Wallet.create({
    userId: id, balance: 250000, accountNumber: '8012345678', bankName: 'Lumina Bank',
  });
  await Transaction.insertMany([
    { id: uuidv4(), userId: id, type: 'debit',  category: 'shopping',    title: 'Jumia Nigeria',       amount: 12500,  status: 'successful', icon: 'shopping_bag',    date: new Date('2024-10-24T14:20:00Z').toISOString(), reference: 'TXN001' },
    { id: uuidv4(), userId: id, type: 'credit', category: 'transfer',    title: 'Transfer from James', amount: 45000,  status: 'successful', icon: 'call_received',   date: new Date('2024-10-23T09:15:00Z').toISOString(), reference: 'TXN002' },
    { id: uuidv4(), userId: id, type: 'debit',  category: 'electricity', title: 'IKEDC Prepaid',       amount: 5000,   status: 'pending',    icon: 'bolt',            date: new Date('2024-10-22T20:45:00Z').toISOString(), reference: 'TXN003' },
    { id: uuidv4(), userId: id, type: 'debit',  category: 'airtime',     title: 'Airtime – MTN',       amount: 1000,   status: 'successful', icon: 'phone_android',   date: new Date('2024-10-21T11:00:00Z').toISOString(), reference: 'TXN004' },
    { id: uuidv4(), userId: id, type: 'debit',  category: 'cable',       title: 'DSTV Compact',        amount: 15700,  status: 'successful', icon: 'tv',              date: new Date('2024-10-20T08:30:00Z').toISOString(), reference: 'TXN005' },
    { id: uuidv4(), userId: id, type: 'credit', category: 'fund',        title: 'Wallet Funding',      amount: 100000, status: 'successful', icon: 'account_balance', date: new Date('2024-10-19T16:00:00Z').toISOString(), reference: 'TXN006' },
    { id: uuidv4(), userId: id, type: 'debit',  category: 'data',        title: 'Data – MTN 5GB',      amount: 1500,   status: 'successful', icon: 'wifi',            date: new Date('2024-10-18T09:00:00Z').toISOString(), reference: 'TXN007' },
  ]);
  console.log('✅ Demo DB seeded — phone: 08012345678 | password: password123');
}

mongoose.connection.once('open', seed);

/// Helper to query flexibly by custom id (UUID) or Mongo _id
// Helper to query flexibly by custom id (UUID string) or Mongo native ObjectId
const getFilter = (id) => {
  if (!id) return {};

  // If it's a UUID string (contains dashes), look ONLY at the custom 'id' field
  if (typeof id === 'string' && id.includes('-')) {
    return { id: id };
  }

  // If it's a valid MongoDB hex ObjectId string or object
  if (mongoose.isValidObjectId(id)) {
    return { _id: id };
  }

  // Fallback default
  return { id: id };
};
// ─── DB INTERFACE ─────────────────────────────────────────────────────────────
const db = {
  findUserByPhone: (phone) => User.findOne({ phone }).lean(),
  findUserById:    (id)    => User.findOne({ id }).lean(),
  findUserByEmail: (email) => User.findOne({ email }).lean(),

  createUser: async ({ fullName, email, phone, password }) => {
    const exists = await User.findOne({ $or: [{ phone }, { email }] });
    if (exists?.phone === phone) throw new Error('Phone already registered');
    if (exists?.email === email) throw new Error('Email already registered');
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ id, fullName, email, phone, passwordHash });
    await Wallet.create({ userId: id, balance: 0, accountNumber: phone.slice(-10) });
    return user.toObject();
  },

  verifyPassword: (user, plain) => bcrypt.compare(plain, user.passwordHash),

  updateUser: async (id, fields) => {
    const existingUser = await User.findOne({ id }).lean();
    if (!existingUser) throw new Error('User not found');
    await User.updateOne({ _id: existingUser._id }, { $set: fields });
    return await User.findOne({ _id: existingUser._id }).lean();
  },

  // PIN Operations (Polymorphic, safe, and consolidated)
  getTransactionPin: async (id) => {
    const user = await User.findOne(
      getFilter(id),
      {
        transactionPin: 1,
        pinAttempts: 1,
        pinLockedUntil: 1,
      }
    ).lean();

    if (!user) throw new Error('User not found');
    return user;
  },

  setTransactionPin: async (id, pinHash) => {
    const filter = getFilter(id);
    const result = await User.updateOne(filter, { 
      $set: { 
        transactionPin: pinHash,
        pinAttempts: 0,
        pinLockedUntil: null
      } 
    });
    if (!result.matchedCount) throw new Error('User not found');
    const fresh = await User.findOne(filter, { transactionPin: 1 }).lean();
    return fresh;
  },

  changeTransactionPin: async (id, pinHash) => {
    const result = await User.updateOne(getFilter(id), {
      $set: {
        transactionPin: pinHash,
        pinAttempts: 0,
        pinLockedUntil: null
      }
    });
    if (!result.matchedCount) throw new Error('User not found');
    return result;
  },

  increasePinAttempts: async (id) => {
    const user = await User.findOne(getFilter(id));
    if (!user) throw new Error('User not found');

    user.pinAttempts = (user.pinAttempts || 0) + 1;

    if (user.pinAttempts >= 5) {
      user.pinAttempts = 0;
      user.pinLockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Locked for 30 minutes
    }

    await user.save();
    return user;
  },

  resetPinAttempts: async (id) => {
    await User.updateOne(getFilter(id), {
      $set: {
        pinAttempts: 0,
        pinLockedUntil: null,
      }
    });
  },

  // Wallet Operations
  getWallet: (userId) => Wallet.findOne({ userId }).lean(),

  debitWallet: async (userId, amount) => {
    const w = await Wallet.findOne({ userId });
    if (!w) throw new Error('Wallet not found');
    if (w.balance < amount) throw new Error('Insufficient balance');
    w.balance = parseFloat((w.balance - amount).toFixed(2));
    await w.save();
    return w.toObject();
  },

  creditWallet: async (userId, amount) => {
    const w = await Wallet.findOne({ userId });
    if (!w) throw new Error('Wallet not found');
    w.balance = parseFloat((w.balance + amount).toFixed(2));
    await w.save();
    return w.toObject();
  },

  // Transaction Operations
  getUserTransactions: async (userId, { page = 1, limit = 20, category } = {}) => {
    const filter = { userId };
    if (category) filter.category = category;
    const total = await Transaction.countDocuments(filter);
    const txns  = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { transactions: txns, total, page, limit };
  },

  createTransaction: async (data) => {
    const txn = await Transaction.create({ id: uuidv4(), ...data });
    return txn.toObject();
  },

  getTransactionById:        (id)        => Transaction.findOne({ id }).lean(),
  getTransactionByReference: (reference) => Transaction.findOne({ reference }).lean(),

  // Token Store Operations
  storeRefreshToken:  (token) => RefreshToken.create({ token }),
  hasRefreshToken:    (token) => RefreshToken.exists({ token }),
  deleteRefreshToken: (token) => RefreshToken.deleteOne({ token }),
};

module.exports = db;
