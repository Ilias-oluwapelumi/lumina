const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const verifyTransactionPin = require("../middleware/verifytransactionPin");

const authCtrl = require("../controllers/auth.controller");
const walletCtrl = require("../controllers/wallet.controller");
const servicesCtrl = require("../controllers/services.controller");
const txnCtrl = require("../controllers/transactions.controller");
const userCtrl = require("../controllers/user.controller");

/*
|--------------------------------------------------------------------------
| AUTH
|--------------------------------------------------------------------------
*/

router.post("/auth/register", authCtrl.register);
router.post("/auth/login", authCtrl.login);
router.post("/auth/refresh", authCtrl.refresh);
router.post("/auth/logout", authCtrl.logout);

router.get(
    "/auth/me",
    auth,
    authCtrl.me
);

/*
|--------------------------------------------------------------------------
| USER
|--------------------------------------------------------------------------
*/

router.get(
    "/users/profile",
    auth,
    userCtrl.getProfile
);

router.patch(
    "/users/profile",
    auth,
    userCtrl.updateProfile
);

router.post(
    "/users/change-password",
    auth,
    userCtrl.changePassword
);

router.get(
    "/users/dashboard",
    auth,
    userCtrl.getDashboardSummary
);

router.post(
    "/users/set-pin",
    auth,
    userCtrl.setPin
);

router.post(
    "/users/change-pin",
    auth,
    userCtrl.changePin
);

/*
|--------------------------------------------------------------------------
| WALLET
|--------------------------------------------------------------------------
*/

router.get(
    "/wallet",
    auth,
    walletCtrl.getWallet
);

router.post(
    "/wallet/fund/initialize",
    auth,
    walletCtrl.initializeFunding
);

router.post(
    "/wallet/fund/verify",
    auth,
    walletCtrl.verifyFunding
);

router.post(
    "/wallet/withdraw",
    auth,
    verifyTransactionPin,
    walletCtrl.withdraw
);

router.post(
    "/wallet/transfer",
    auth,
    verifyTransactionPin,
    walletCtrl.transfer
);

/*
|--------------------------------------------------------------------------
| TRANSACTIONS
|--------------------------------------------------------------------------
*/

router.get(
    "/transactions",
    auth,
    txnCtrl.getTransactions
);

router.get(
    "/transactions/:id",
    auth,
    txnCtrl.getTransaction
);

/*
|--------------------------------------------------------------------------
| AIRTIME
|--------------------------------------------------------------------------
*/

// Available Networks
router.get(
    "/services/networks",
    auth,
    servicesCtrl.getNetworks
);

// Buy Airtime
router.post(
    "/services/airtime",
    auth,
    verifyTransactionPin,
    servicesCtrl.buyAirtime
);

/*
|--------------------------------------------------------------------------
| DATA
|--------------------------------------------------------------------------
*/

// Get Data Plans
// Example:
// GET /services/data/plans/MTN
// GET /services/data/plans/GLO
// GET /services/data/plans/Airtel

router.get(
    "/services/data/plans/:network",
    auth,
    servicesCtrl.getDataPlans
);

// Buy Data

router.post(
    "/services/data",
    auth,
    verifyTransactionPin,
    servicesCtrl.buyData
);
/*
|--------------------------------------------------------------------------
| CABLE TV
|--------------------------------------------------------------------------
*/

// Get Cable Packages
// Example:
// GET /services/cable/packages/DSTV
// GET /services/cable/packages/GOTV
// GET /services/cable/packages/STARTIMES

router.get(
    "/services/cable/packages/:service",
    auth,
    servicesCtrl.getCablePackages
);

// Verify Smart Card

router.post(
    "/services/cable/verify",
    auth,
    servicesCtrl.verifyCable
);

// Purchase Cable Subscription

router.post(
    "/services/cable",
    auth,
    verifyTransactionPin,
    servicesCtrl.buyCable
);
/*
|--------------------------------------------------------------------------
| ELECTRICITY
|--------------------------------------------------------------------------
*/

// Get all Electricity Discos

router.get(
    "/services/electricity/discos",
    auth,
    servicesCtrl.getDiscos
);

// Verify Meter

router.post(
    "/services/electricity/verify",
    auth,
    servicesCtrl.verifyMeter
);

// Pay Electricity Bill

router.post(
    "/services/electricity/pay",
    auth,
    verifyTransactionPin,
    servicesCtrl.payElectricity
);
/*
|--------------------------------------------------------------------------
| EDUCATION
|--------------------------------------------------------------------------
*/

// Get all available WAEC/NECO products

router.get(
    "/services/education/products",
    auth,
    servicesCtrl.getEducationProducts
);

// Purchase Education PIN

router.post(
    "/services/education",
    auth,
    verifyTransactionPin,
    servicesCtrl.purchaseEducation
);

/*
|--------------------------------------------------------------------------
| BETTING
|--------------------------------------------------------------------------
*/

// Enable this route ONLY if fundBetting exists in services.controller.js

if (typeof servicesCtrl.fundBetting === "function") {
    router.post(
        "/services/betting",
        auth,
        verifyTransactionPin,
        servicesCtrl.fundBetting
    );
}

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = router;