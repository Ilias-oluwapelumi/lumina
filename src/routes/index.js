const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');

const authCtrl = require('../controllers/auth.controller');
const walletCtrl = require('../controllers/wallet.controller');
const servicesCtrl = require('../controllers/services.controller');
const txnCtrl = require('../controllers/transactions.controller');
const userCtrl = require('../controllers/user.controller');

// ─── AUTH ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.post('/auth/refresh', authCtrl.refresh);
router.post('/auth/logout', authCtrl.logout);
router.get('/auth/me', auth, authCtrl.me);

// ─── USERS / PROFILE ─────────────────────────────────────────────────────────
router.get('/users/profile', auth, userCtrl.getProfile);
router.patch('/users/profile', auth, userCtrl.updateProfile);
router.post('/users/change-password', auth, userCtrl.changePassword);
router.get('/users/dashboard', auth, userCtrl.getDashboardSummary);

// ─── WALLET ───────────────────────────────────────────────────────────────────
router.get('/wallet', auth, walletCtrl.getWallet);
//router.post('/wallet/fund', auth, walletCtrl.fundWallet);
router.post('/wallet/withdraw', auth, walletCtrl.withdraw);
router.post('/wallet/transfer', auth, walletCtrl.transfer);
router.post('/wallet/fund/initialize', auth, walletCtrl.initializeFunding);
router.post('/wallet/fund/verify', auth, walletCtrl.verifyFunding);

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
router.get('/transactions', auth, txnCtrl.getTransactions);
router.get('/transactions/:id', auth, txnCtrl.getTransaction);

// ─── SERVICES ─────────────────────────────────────────────────────────────────
router.get('/services/networks', auth, servicesCtrl.getNetworks);
router.post('/services/airtime', auth, servicesCtrl.buyAirtime);

router.get('/services/data/plans', auth, servicesCtrl.getDataPlans);
router.post('/services/data', auth, servicesCtrl.buyData);

router.get('/services/electricity/discos', auth, servicesCtrl.getDiscos);
router.post('/services/electricity/verify', auth, servicesCtrl.verifyMeter);
router.post('/services/electricity/pay', auth, servicesCtrl.payElectricity);

router.get('/services/cable/plans', auth, servicesCtrl.getCablePlans);
router.post('/services/cable/verify', auth, servicesCtrl.verifyCableCard);
router.post('/services/cable/subscribe', auth, servicesCtrl.subscribeCable);

router.post('/services/betting', auth, servicesCtrl.fundBetting);

router.post('/services/education', auth, servicesCtrl.purchaseEducation);

module.exports = router;
