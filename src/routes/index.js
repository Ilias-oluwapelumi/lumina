const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const adminAuth = require("../middleware/admin_auth");
const verifyTransactionPin = require("../middleware/verifytransactionPin");

const authCtrl = require("../controllers/auth.controller");
const walletCtrl = require("../controllers/wallet.controller");
const servicesCtrl = require("../controllers/services.controller");
const txnCtrl = require("../controllers/transactions.controller");
const userCtrl = require("../controllers/user.controller");
const notificationsCtrl = require("../controllers/notifications.controller");
const adminCtrl = require("../controllers/admin.controller");

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
| NOTIFICATIONS
|--------------------------------------------------------------------------
*/

router.get(
    "/notifications",
    auth,
    notificationsCtrl.getNotifications
);

router.get(
    "/notifications/unread-count",
    auth,
    notificationsCtrl.getUnreadCount
);

router.post(
    "/notifications/:id/read",
    auth,
    notificationsCtrl.markRead
);

router.post(
    "/notifications/read-all",
    auth,
    notificationsCtrl.markAllRead
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
| MONNIFY WEBHOOK
|--------------------------------------------------------------------------
| No `auth` middleware — Monnify's servers call this directly, not a
| logged-in user. Security comes from verifying the signature inside the
| controller instead.
|
| express.raw() here (NOT express.json()) is required so the controller
| gets the exact raw bytes Monnify sent — needed for the HMAC signature
| check. If your app.js/server.js already applies express.json() globally
| before this router is mounted, that will consume/parse the body first
| and this route will get an already-parsed object instead of a Buffer,
| breaking signature verification. Make sure this route (or this whole
| router) is registered before any global express.json() middleware, or
| carve out this specific path with its own raw parser ahead of the global
| json() call in your app.js.
*/
router.post(
    "/wallet/webhook/monnify",
    express.raw({ type: "application/json" }),
    walletCtrl.monnifyWebhook
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
| ADMIN
|--------------------------------------------------------------------------
| Separate token scope (adminAuth) from regular user auth — an admin token
| cannot be used on /users or /wallet routes and vice versa.
*/

router.post("/admin/login", adminCtrl.login);

router.get("/admin/me", adminAuth, adminCtrl.me);

router.post("/admin/change-password", adminAuth, adminCtrl.changePassword);

router.get("/admin/dashboard", adminAuth, adminCtrl.getDashboard);

router.get("/admin/users", adminAuth, adminCtrl.getUsers);
router.get("/admin/users/:id", adminAuth, adminCtrl.getUserDetail);
router.post("/admin/users/:id/suspend", adminAuth, adminCtrl.suspendUser);
router.post("/admin/users/:id/unsuspend", adminAuth, adminCtrl.unsuspendUser);
router.post("/admin/users/:id/adjust-wallet", adminAuth, adminCtrl.adjustWallet);

router.get("/admin/transactions", adminAuth, adminCtrl.getTransactions);

router.get("/admin/pricing/:category", adminAuth, adminCtrl.getPricing);
router.post("/admin/pricing", adminAuth, adminCtrl.updatePricing);

router.post("/admin/notifications/broadcast", adminAuth, adminCtrl.broadcast);

/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = router;