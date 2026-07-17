const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const verifyTransactionPin = require('../middleware/verifytransactionPin');

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
//router.post('/wallet/withdraw', auth, walletCtrl.withdraw);
//router.post('/wallet/transfer', auth, walletCtrl.transfer);
router.post('/wallet/fund/initialize', auth, walletCtrl.initializeFunding);
router.post('/wallet/fund/verify', auth, walletCtrl.verifyFunding);
router.post(
    '/wallet/withdraw',
    auth,
    verifyTransactionPin,
    walletCtrl.withdraw
);

router.post(
    '/wallet/transfer',
    auth,
    verifyTransactionPin,
    walletCtrl.transfer
);

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────
router.get('/transactions', auth, txnCtrl.getTransactions);
router.get('/transactions/:id', auth, txnCtrl.getTransaction);

// ─── SERVICES ─────────────────────────────────────────────────────────────────
router.get('/services/networks', auth, servicesCtrl.getNetworks);
//router.post('/services/airtime', auth, servicesCtrl.buyAirtime);
router.post(
    '/services/airtime',
    auth,
    verifyTransactionPin,
    servicesCtrl.buyAirtime
);

router.get('/services/data/plans', auth, servicesCtrl.getDataPlans);
//router.post('/services/data', auth, servicesCtrl.buyData);
router.post(
    '/services/data',
    auth,
    verifyTransactionPin,
    servicesCtrl.buyData
);

// ===================== CABLE =====================
// ===================== CABLE =====================

// Get cable packages
router.get(
  '/services/cable/packages',
  auth,
  servicesCtrl.getCablePackages
);

// Verify customer
router.post(
  '/services/cable/verify',
  auth,
  verifyTransactionPin,
  servicesCtrl.verifyCable
);

// Buy cable
router.post(
  '/services/cable',
  auth,
  verifyTransactionPin,
  servicesCtrl.buyCable
);


router.get('/services/electricity/discos', auth, servicesCtrl.getDiscos);
router.post('/services/electricity/verify', auth, servicesCtrl.verifyMeter);
//router.post('/services/electricity/pay', auth, servicesCtrl.payElectricity);
router.post(
    '/services/electricity/pay',
    auth,
    verifyTransactionPin,
    servicesCtrl.payElectricity
);

//router.get('/services/cable/plans', auth, servicesCtrl.getCablePlans);
//router.post('/services/cable/verify', auth, servicesCtrl.verifyCableCard);
//router.post('/services/cable/subscribe', auth, servicesCtrl.subscribeCable);
//router.post(
 //   '/services/cable/subscribe',
  //  auth,
  //  verifyTransactionPin,
   // servicesCtrl.subscribeCable
//);

//router.post('/services/betting', auth, servicesCtrl.fundBetting);
router.post(
    '/services/betting',
    auth,
    verifyTransactionPin,
    servicesCtrl.fundBetting
);

//router.post('/services/education', auth, servicesCtrl.purchaseEducation);
router.post(
    '/services/education',
    auth,
    verifyTransactionPin,
    servicesCtrl.purchaseEducation
);


router.post('/users/set-pin', auth, userCtrl.setPin);
//router.post('/users/verify-pin', auth, userCtrl.verifyPin);
router.post('/users/change-pin', auth, userCtrl.changePin);

module.exports = router;
