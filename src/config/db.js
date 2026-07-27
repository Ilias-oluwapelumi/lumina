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
  suspended: { type: Boolean, default: false },
  createdAt: { type: String, default: () => new Date().toISOString() },
});

const walletSchema = new mongoose.Schema({
  userId:        { type: String, required: true, unique: true },
  balance:       { type: Number, default: 0 },
  accountNumber: { type: String },
  bankName:      { type: String, default: 'Lumina Bank' },
  monnifyAccountReference: { type: String, default: null },
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

const productPriceSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },

  provider: {
    type: String,
    required: true,
  },

  productCode: {
    type: String,
    required: true,
  },

  productName: String,

  buyingPrice: {
    type: Number,
    default: 0,
  },

  sellingPrice: {
    type: Number,
    required: true,
  },
});

const refreshTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
});

const notificationSchema = new mongoose.Schema({
  id:      { type: String, default: () => uuidv4(), unique: true },
  userId:  { type: String, required: true },
  type:    { type: String, default: 'general' }, // transaction, security, promo, general
  title:   { type: String, required: true },
  message: { type: String, required: true },
  icon:    { type: String, default: 'notifications' },
  read:    { type: Boolean, default: false },
  date:    { type: String, default: () => new Date().toISOString() },
  meta:    { type: mongoose.Schema.Types.Mixed },
});

const adminSchema = new mongoose.Schema({
  id:           { type: String, default: () => uuidv4(), unique: true },
  fullName:     { type: String, required: true },
  email:        { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role:         { type: String, default: 'admin' }, // admin, superadmin
  createdAt:    { type: String, default: () => new Date().toISOString() },
});

const User         = mongoose.models.User         || mongoose.model('User', userSchema);
const Wallet       = mongoose.models.Wallet       || mongoose.model('Wallet', walletSchema);
const Transaction  = mongoose.models.Transaction  || mongoose.model('Transaction', transactionSchema);
const RefreshToken = mongoose.models.RefreshToken || mongoose.model('RefreshToken', refreshTokenSchema);
const Notification  = mongoose.models.Notification  || mongoose.model('Notification', notificationSchema);
const Admin         = mongoose.models.Admin         || mongoose.model('Admin', adminSchema);

const ProductPrice =
    mongoose.models.ProductPrice ||
    mongoose.model("ProductPrice", productPriceSchema);
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

// ─── SEED DEFAULT ADMIN ──────────────────────────────────────────────────────
async function seedAdmin() {
  const exists = await Admin.findOne({ email: 'admin@lumina.ng' });
  if (exists) return;
  const passwordHash = await bcrypt.hash('Admin@12345', 10);
  await Admin.create({
    id: uuidv4(), fullName: 'Lumina Super Admin', email: 'admin@lumina.ng',
    passwordHash, role: 'superadmin',
  });
  console.log('✅ Default admin seeded — email: admin@lumina.ng | password: Admin@12345');
}

mongoose.connection.once('open', seedAdmin);

// Helper to query flexibly by custom id (UUID string) or Mongo native ObjectId
const getFilter = (id) => {
  if (!id) return {};

  // If a full user document was passed
  if (typeof id === "object") {
    if (id.id) {
      return { id: id.id };
    }

    if (id._id) {
      return { _id: id._id };
    }
  }

  // UUIDs always contain dashes
  if (typeof id === "string" && id.includes("-")) {
    return { id };
  }

  // Only use Mongo _id if it does NOT look like a UUID
  if (
    typeof id === "string" &&
    mongoose.isValidObjectId(id) &&
    !id.includes("-")
  ) {
    return { _id: id };
  }

  return { id };
};
// ─── DB INTERFACE ─────────────────────────────────────────────────────────────
const db = {
  findUserByPhone: (phone) => User.findOne({ phone }).lean(),
  findUserById:    (id)    => User.findOne(getFilter(id)).lean(), 
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
    const filter = getFilter(id);
    const existingUser = await User.findOne(filter).lean();
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

    console.log("FILTER =", filter);

    const user = await User.findOne(filter);

    console.log("FOUND USER =", user);

    if (!user) {
        throw new Error("User not found");
    }

    user.transactionPin = pinHash;
    user.pinAttempts = 0;
    user.pinLockedUntil = null;

    await user.save();

    return user.toObject();
},
  changeTransactionPin: async (id, pinHash) => {
    const filter = getFilter(id);
    const result = await User.updateOne(filter, {
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
    const filter = getFilter(id);
    const user = await User.findOne(filter);
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

  setWalletAccountDetails: async (userId, { accountNumber, bankName, monnifyAccountReference }) => {
    return await Wallet.findOneAndUpdate(
      { userId },
      { $set: { accountNumber, bankName, monnifyAccountReference } },
      { new: true }
    ).lean();
  },

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

  updateTransactionStatus: async (reference, status) => {
    return await Transaction.findOneAndUpdate(
      { reference },
      { $set: { status } },
      { new: true }
    ).lean();
  },

  // ===============================
// PRODUCT PRICES
// ===============================

getProductPrice: async ({
    category,
    provider,
    productCode,
}) => {

    return await ProductPrice.findOne({
        category,
        provider,
        productCode,
    }).lean();

},

getAllProductPrices: async (category) => {

    return await ProductPrice.find({
        category,
    }).lean();

},

updateProductPrice: async ({
    category,
    provider,
    productCode,
    productName,
    buyingPrice,
    sellingPrice,
}) => {

    return await ProductPrice.findOneAndUpdate(

        {
            category,
            provider,
            productCode,
        },

        {
            category,
            provider,
            productCode,
            productName,
            buyingPrice,
            sellingPrice,
        },

        {
            upsert: true,
            new: true,
        }

    ).lean();

},

  // Notification Operations
  createNotification: async ({ userId, type = 'general', title, message, icon = 'notifications', meta }) => {
    const n = await Notification.create({ id: uuidv4(), userId, type, title, message, icon, meta });
    return n.toObject();
  },

  getUserNotifications: async (userId, { page = 1, limit = 20 } = {}) => {
    const filter = { userId };
    const total = await Notification.countDocuments(filter);
    const notifications = await Notification.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { notifications, total, page, limit };
  },

  getUnreadNotificationCount: (userId) =>
    Notification.countDocuments({ userId, read: false }),

  markNotificationRead: async (id, userId) => {
    return await Notification.findOneAndUpdate(
      { id, userId },
      { $set: { read: true } },
      { new: true }
    ).lean();
  },

  markAllNotificationsRead: async (userId) => {
    return await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
  },

  // Token Store Operations
  storeRefreshToken:  (token) => RefreshToken.create({ token }),
  hasRefreshToken:    (token) => RefreshToken.exists({ token }),
  deleteRefreshToken: (token) => RefreshToken.deleteOne({ token }),

  // ===============================
  // ADMIN OPERATIONS
  // ===============================

  findAdminByEmail: (email) => Admin.findOne({ email }).lean(),
  verifyAdminPassword: (admin, plain) => bcrypt.compare(plain, admin.passwordHash),

  changeAdminPassword: async (email, newPassword) => {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const result = await Admin.updateOne({ email }, { $set: { passwordHash } });
    if (!result.matchedCount) throw new Error('Admin not found');
    return result;
  },

  getDashboardStats: async () => {
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ kycVerified: true });
    const suspendedUsers = await User.countDocuments({ suspended: true });

    const walletAgg = await Wallet.aggregate([
      { $group: { _id: null, totalBalance: { $sum: '$balance' } } },
    ]);
    const totalWalletBalance = walletAgg[0]?.totalBalance || 0;

    const txnByStatus = await Transaction.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]);

    const txnByCategory = await Transaction.aggregate([
      { $match: { status: 'successful' } },
      { $group: { _id: '$category', count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]);

    const totalTransactions = await Transaction.countDocuments();

    return {
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      totalWalletBalance,
      totalTransactions,
      byStatus: txnByStatus,
      byCategory: txnByCategory,
    };
  },

  searchUsers: async ({ query, page = 1, limit = 20 } = {}) => {
    const filter = query
      ? {
          $or: [
            { fullName: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } },
            { phone: { $regex: query, $options: 'i' } },
          ],
        }
      : {};
    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash -transactionPin')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { users, total, page, limit };
  },

  setUserSuspended: async (id, suspended) => {
    const filter = getFilter(id);
    const result = await User.updateOne(filter, { $set: { suspended } });
    if (!result.matchedCount) throw new Error('User not found');
    return result;
  },

  searchTransactions: async ({ query, status, category, page = 1, limit = 20 } = {}) => {
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (query) {
      filter.$or = [
        { reference: { $regex: query, $options: 'i' } },
        { title: { $regex: query, $options: 'i' } },
      ];
    }
    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
    return { transactions, total, page, limit };
  },

  adminAdjustWallet: async (userId, amount, note, adminEmail) => {
    const numericAmount = parseFloat(amount);
    const w = await Wallet.findOne({ userId });
    if (!w) throw new Error('Wallet not found');
    w.balance = parseFloat((w.balance + numericAmount).toFixed(2));
    await w.save();

    const txn = await Transaction.create({
      id: uuidv4(),
      userId,
      type: numericAmount >= 0 ? 'credit' : 'debit',
      category: 'admin_adjustment',
      title: numericAmount >= 0 ? 'Wallet Credit (Admin)' : 'Wallet Debit (Admin)',
      amount: Math.abs(numericAmount),
      status: 'successful',
      icon: 'account_balance_wallet',
      reference: `ADJ${Date.now()}`,
      meta: { note: note || '', adjustedBy: adminEmail || 'admin' },
    });

    await Notification.create({
      id: uuidv4(),
      userId,
      type: 'transaction',
      title: numericAmount >= 0 ? 'Wallet Credited' : 'Wallet Debited',
      message: `₦${Math.abs(numericAmount).toLocaleString()} ${numericAmount >= 0 ? 'credited to' : 'debited from'} your wallet by support${note ? `: ${note}` : ''}`,
      icon: 'account_balance_wallet',
      meta: { reference: txn.reference, category: 'admin_adjustment' },
    });

    return { wallet: w.toObject(), transaction: txn.toObject() };
  },

  broadcastNotification: async ({ title, message, icon = 'notifications', type = 'promo' }) => {
    const users = await User.find({}, { id: 1 }).lean();
    const docs = users.map((u) => ({
      id: uuidv4(),
      userId: u.id,
      type,
      title,
      message,
      icon,
    }));
    if (docs.length) await Notification.insertMany(docs);
    return { recipients: docs.length };
  },
};

module.exports = db;