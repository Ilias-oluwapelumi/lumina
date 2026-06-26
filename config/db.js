/**
 * Lumina – In-memory database (no external DB needed for dev).
 * Production: swap to PostgreSQL / MongoDB with the same interface.
 */

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── IN-MEMORY STORES ───────────────────────────────────────────────────────
const users = new Map();
const wallets = new Map();
const transactions = new Map();
const refreshTokens = new Set();

// ─── SEED A DEMO USER ───────────────────────────────────────────────────────
async function seed() {
  const id = 'demo-user-001';
  const hash = await bcrypt.hash('password123', 10);
  users.set('08012345678', {
    id,
    fullName: 'Tobi Johnson',
    email: 'tobi@lumina.ng',
    phone: '08012345678',
    passwordHash: hash,
    kycTier: 3,
    kycVerified: true,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  });
  wallets.set(id, {
    userId: id,
    balance: 250000.00,
    accountNumber: '8012345678',
    bankName: 'Lumina Bank',
  });
  // seed sample transactions
  const txns = [
    { id: uuidv4(), userId: id, type: 'debit', category: 'shopping', title: 'Jumia Nigeria', amount: 12500, status: 'successful', icon: 'shopping_bag', date: new Date('2024-10-24T14:20:00').toISOString(), reference: 'TXN001' },
    { id: uuidv4(), userId: id, type: 'credit', category: 'transfer', title: 'Transfer from James', amount: 45000, status: 'successful', icon: 'call_received', date: new Date('2024-10-23T09:15:00').toISOString(), reference: 'TXN002' },
    { id: uuidv4(), userId: id, type: 'debit', category: 'electricity', title: 'IKEDC Prepaid', amount: 5000, status: 'pending', icon: 'bolt', date: new Date('2024-10-22T20:45:00').toISOString(), reference: 'TXN003' },
    { id: uuidv4(), userId: id, type: 'debit', category: 'airtime', title: 'Airtime – MTN', amount: 1000, status: 'successful', icon: 'phone_android', date: new Date('2024-10-21T11:00:00').toISOString(), reference: 'TXN004' },
    { id: uuidv4(), userId: id, type: 'debit', category: 'cable', title: 'DSTV Compact', amount: 15700, status: 'successful', icon: 'tv', date: new Date('2024-10-20T08:30:00').toISOString(), reference: 'TXN005' },
    { id: uuidv4(), userId: id, type: 'credit', category: 'fund', title: 'Wallet Funding', amount: 100000, status: 'successful', icon: 'account_balance', date: new Date('2024-10-19T16:00:00').toISOString(), reference: 'TXN006' },
    { id: uuidv4(), userId: id, type: 'debit', category: 'data', title: 'Data – MTN 5GB', amount: 1500, status: 'successful', icon: 'wifi', date: new Date('2024-10-18T09:00:00').toISOString(), reference: 'TXN007' },
  ];
  txns.forEach(t => transactions.set(t.id, t));
  console.log('✅  Demo DB seeded — phone: 08012345678 | password: password123');
}

seed();

// ─── DB INTERFACE ────────────────────────────────────────────────────────────

const db = {
  // USERS
  findUserByPhone: (phone) => users.get(phone) || null,
  findUserById: (id) => [...users.values()].find(u => u.id === id) || null,
  findUserByEmail: (email) => [...users.values()].find(u => u.email === email) || null,

  createUser: async ({ fullName, email, phone, password }) => {
    if (users.has(phone)) throw new Error('Phone already registered');
    if ([...users.values()].some(u => u.email === email)) throw new Error('Email already registered');
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const accountNumber = phone.slice(-10);
    const user = {
      id, fullName, email, phone, passwordHash,
      kycTier: 1, kycVerified: false,
      avatarUrl: null, createdAt: new Date().toISOString(),
    };
    users.set(phone, user);
    wallets.set(id, { userId: id, balance: 0, accountNumber, bankName: 'Lumina Bank' });
    return user;
  },

  verifyPassword: async (user, plain) => bcrypt.compare(plain, user.passwordHash),

  updateUser: (id, fields) => {
    const user = db.findUserById(id);
    if (!user) throw new Error('User not found');
    const updated = { ...user, ...fields };
    users.set(user.phone, updated);
    return updated;
  },

  // WALLETS
  getWallet: (userId) => wallets.get(userId) || null,

  debitWallet: (userId, amount) => {
    const w = wallets.get(userId);
    if (!w) throw new Error('Wallet not found');
    if (w.balance < amount) throw new Error('Insufficient balance');
    w.balance = parseFloat((w.balance - amount).toFixed(2));
    return w;
  },

  creditWallet: (userId, amount) => {
    const w = wallets.get(userId);
    if (!w) throw new Error('Wallet not found');
    w.balance = parseFloat((w.balance + amount).toFixed(2));
    return w;
  },

  // TRANSACTIONS
  getUserTransactions: (userId, { page = 1, limit = 20, category } = {}) => {
    let txns = [...transactions.values()]
      .filter(t => t.userId === userId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    if (category) txns = txns.filter(t => t.category === category);
    const total = txns.length;
    const start = (page - 1) * limit;
    return { transactions: txns.slice(start, start + limit), total, page, limit };
  },

  createTransaction: (data) => {
    const txn = { id: uuidv4(), ...data, date: new Date().toISOString() };
    transactions.set(txn.id, txn);
    return txn;
  },

  getTransactionById: (id) => transactions.get(id) || null,

  // REFRESH TOKENS
  storeRefreshToken: (token) => refreshTokens.add(token),
  hasRefreshToken: (token) => refreshTokens.has(token),
  deleteRefreshToken: (token) => refreshTokens.delete(token),
};

module.exports = db;
