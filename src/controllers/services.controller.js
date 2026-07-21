const db = require("../config/db");
const pricing = require("../config/pricing");
const subAndGain = require("../services/subandgain.service");

/*
|--------------------------------------------------------------------------
| BUY AIRTIME
|--------------------------------------------------------------------------
*/

// POST /api/services/airtime
exports.buyAirtime = async (req, res) => {
    console.log("===== BUY AIRTIME CONTROLLER HIT =====");

    try {

        const {
            network,
            phone,
            amount,
        } = req.body;

        if (!network || !phone || !amount) {
            return res.status(400).json({
                success: false,
                message: "Network, phone and amount are required",
            });
        }

        // Get wallet
        const wallet = await db.getWallet(req.user.id);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            });
        }

        const providerAmount = Number(amount);
        const amountToCharge = providerAmount + pricing.airtime;

        if (wallet.balance < amountToCharge) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        // Buy from provider
        const response = await subAndGain.buyAirtime({
            network,
            phone,
            amount: providerAmount,
        });

        console.log(response);

        if (
            response.status !== "Approved" &&
            response.status !== "SUCCESS"
        ) {
            return res.status(400).json({
                success: false,
                message: "Airtime purchase failed",
                provider: response,
            });
        }

        // Debit wallet
        const updatedWallet = await db.debitWallet(
            req.user.id,
            amountToCharge
        );

        const reference = `AIR${Date.now()}`;

        const txn = await db.createTransaction({
            userId: req.user.id,
            type: "debit",
            category: "airtime",
            title: `${network} Airtime`,
            amount: amountToCharge,
            status: "successful",
            icon: "phone",
            reference,
            meta: {
                network,
                phone,
                providerReference: response.trans_id,
                providerResponse: response,
            },
        });

        return res.json({
            success: true,
            message: "Airtime purchased successfully",
            data: {
                wallet: updatedWallet,
                transaction: txn,
                provider: response,
            },
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};
/*
|--------------------------------------------------------------------------
| BUY DATA
|--------------------------------------------------------------------------
*/

// POST /api/services/data
exports.buyData = async (req, res) => {
    console.log("===== BUY DATA CONTROLLER HIT =====");

    try {

        const {
            network,
            phone,
            dataPlan,
        } = req.body;

        if (!network || !phone || !dataPlan) {
            return res.status(400).json({
                success: false,
                message: "Network, phone and data plan are required",
            });
        }

        // Get wallet
        const wallet = await db.getWallet(req.user.id);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            });
        }

        console.log("NETWORK =", network);
        console.log("DATAPLAN =", dataPlan);
        console.log("PHONE =", phone);

        /*
        |--------------------------------------------------------------------------
        | Get Bundle Price From SubAndGain
        |--------------------------------------------------------------------------
        */

        const plans = await subAndGain.getDataPlans(network);

        const selectedPlan = plans.find(
            p => String(p.id) === String(dataPlan)
        );

        if (!selectedPlan) {
            return res.status(400).json({
                success: false,
                message: "Invalid data plan selected",
            });
        }

        // Price already includes your profit
        const amountToCharge = Number(selectedPlan.price);

        if (wallet.balance < amountToCharge) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Buy From SubAndGain
        |--------------------------------------------------------------------------
        */

        const response = await subAndGain.buyData({
            network,
            phone,
            dataPlan,
        });

        console.log("FULL SUBANDGAIN DATA RESPONSE");
        console.log(response);

        if (response.error) {
            return res.status(400).json({
                success: false,
                message: response.description,
                provider: response,
            });
        }

        if (
            response.status !== "Approved" &&
            response.status !== "SUCCESS"
        ) {
            return res.status(400).json({
                success: false,
                message: "Data purchase failed",
                provider: response,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Debit Wallet
        |--------------------------------------------------------------------------
        */

        const updatedWallet = await db.debitWallet(
            req.user.id,
            amountToCharge
        );

        const reference = `DATA${Date.now()}`;

        /*
        |--------------------------------------------------------------------------
        | Save Transaction
        |--------------------------------------------------------------------------
        */

        const txn = await db.createTransaction({
            userId: req.user.id,
            type: "debit",
            category: "data",
            title: `${network} ${selectedPlan.name}`,
            amount: amountToCharge,
            status: "successful",
            icon: "wifi",
            reference,
            meta: {
                network,
                phone,
                dataPlan,
                providerReference: response.trans_id,
                providerResponse: response,
            },
        });

        return res.json({
            success: true,
            message: "Data purchased successfully",
            data: {
                wallet: updatedWallet,
                transaction: txn,
                provider: response,
            },
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};
/*
|--------------------------------------------------------------------------
| BUY CABLE TV
|--------------------------------------------------------------------------
*/

// POST /api/services/cable
exports.buyCable = async (req, res) => {

    console.log("===== BUY CABLE CONTROLLER HIT =====");

    try {

        const {
            service,
            smartNumber,
            bills_code,
        } = req.body;

        if (!service || !smartNumber || !bills_code) {
            return res.status(400).json({
                success: false,
                message: "Service, smart number and package are required",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Get Wallet
        |--------------------------------------------------------------------------
        */

        const wallet = await db.getWallet(req.user.id);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Get Package From SubAndGain
        |--------------------------------------------------------------------------
        */

        const packages = await subAndGain.getCablePackages(service);

        const selectedPackage = packages.find(
            p => String(p.code) === String(bills_code)
        );

        if (!selectedPackage) {
            return res.status(400).json({
                success: false,
                message: "Invalid cable package selected",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Price
        |--------------------------------------------------------------------------
        */

        // getCablePackages() already returns selling price
        const amountToCharge = Number(selectedPackage.price);

        if (wallet.balance < amountToCharge) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Buy From SubAndGain
        |--------------------------------------------------------------------------
        */

        const response = await subAndGain.buyCable({
            service,
            bills_code,
            smartNumber,
        });

        console.log("FULL SUBANDGAIN CABLE RESPONSE");
        console.log(response);

        if (response.error) {
            return res.status(400).json({
                success: false,
                message: response.description,
                provider: response,
            });
        }

        if (
            response.status !== "Approved" &&
            response.status !== "SUCCESS"
        ) {
            return res.status(400).json({
                success: false,
                message: "Cable purchase failed",
                provider: response,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Debit Wallet
        |--------------------------------------------------------------------------
        */

        const updatedWallet = await db.debitWallet(
            req.user.id,
            amountToCharge
        );

        const reference = `CAB${Date.now()}`;

        /*
        |--------------------------------------------------------------------------
        | Save Transaction
        |--------------------------------------------------------------------------
        */

        const txn = await db.createTransaction({
            userId: req.user.id,
            type: "debit",
            category: "cable",
            title: `${service} - ${selectedPackage.name}`,
            amount: amountToCharge,
            status: "successful",
            icon: "tv",
            reference,
            meta: {
                service,
                smartNumber,
                bills_code,
                providerReference: response.trans_id,
                providerResponse: response,
            },
        });

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return res.json({
            success: true,
            message: "Cable subscription successful",
            data: {
                wallet: updatedWallet,
                transaction: txn,
                provider: response,
            },
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }

};   /*
|--------------------------------------------------------------------------
| BUY ELECTRICITY
|--------------------------------------------------------------------------
*/

// POST /api/services/electricity
exports.payElectricity = async (req, res) => {

    console.log("===== BUY ELECTRICITY CONTROLLER HIT =====");

    try {

        const {
            service,
            meterNumber,
            meterType,
            accessToken,
            amount,
        } = req.body;

        if (
            !service ||
            !meterNumber ||
            !meterType ||
            !accessToken ||
            !amount
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Wallet
        |--------------------------------------------------------------------------
        */

        const wallet = await db.getWallet(req.user.id);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Amount
        |--------------------------------------------------------------------------
        */

        const amountToCharge = Number(amount) + pricing.electricity;

        if (wallet.balance < amountToCharge) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Buy From SubAndGain
        |--------------------------------------------------------------------------
        */

        const response = await subAndGain.payElectricity({
            service,
            meterNumber,
            meterType,
            accessToken,
            amount,
        });

        console.log(response);

        if (response.error) {
            return res.status(400).json({
                success: false,
                message: response.description,
                provider: response,
            });
        }

        if (
            response.status !== "Approved" &&
            response.status !== "SUCCESS"
        ) {
            return res.status(400).json({
                success: false,
                message: "Electricity purchase failed",
                provider: response,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Debit Wallet
        |--------------------------------------------------------------------------
        */

        const updatedWallet = await db.debitWallet(
            req.user.id,
            amountToCharge
        );

        const reference = `ELEC${Date.now()}`;

        /*
        |--------------------------------------------------------------------------
        | Save Transaction
        |--------------------------------------------------------------------------
        */

        const txn = await db.createTransaction({
            userId: req.user.id,
            type: "debit",
            category: "electricity",
            title: `${service} Electricity`,
            amount: amountToCharge,
            status: "successful",
            icon: "bolt",
            reference,
            meta: {
                service,
                meterNumber,
                meterType,
                token: response.MeterToken,
                providerReference: response.trans_id,
                providerResponse: response,
            },
        });

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return res.json({
            success: true,
            message: "Electricity purchased successfully",
            data: {
                wallet: updatedWallet,
                transaction: txn,
                token: response.MeterToken,
                provider: response,
            },
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }
};
/*
|--------------------------------------------------------------------------
| BUY EDUCATION PIN
|--------------------------------------------------------------------------
*/

// POST /api/services/education
exports.purchaseEducation = async (req, res) => {

    console.log("===== BUY EDUCATION CONTROLLER HIT =====");

    try {

        const { eduType } = req.body;

        if (!eduType) {
            return res.status(400).json({
                success: false,
                message: "Education type is required",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Wallet
        |--------------------------------------------------------------------------
        */

        const wallet = await db.getWallet(req.user.id);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Get Product From SubAndGain
        |--------------------------------------------------------------------------
        */

        const products = await subAndGain.getEducationProducts();

        const product = products.find(
            p => p.code === eduType
        );

        if (!product) {
            return res.status(400).json({
                success: false,
                message: "Invalid education product",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Product Price
        |--------------------------------------------------------------------------
        */

        // Price already contains your configured profit
        const amountToCharge = Number(product.price);

        if (wallet.balance < amountToCharge) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Buy From SubAndGain
        |--------------------------------------------------------------------------
        */

        // Use the already-validated product's code — this is the value
        // that was matched against SubAndGain's own bundle list above.
        // (Previously this read a separate `eduCode` field from the
        // request body that the frontend never sent, so it was always
        // undefined and every purchase would fail against the provider.)
        const response = await subAndGain.buyEducation({
            eduCode: product.code,
        });

        console.log(response);

        if (response.error) {
            return res.status(400).json({
                success: false,
                message: response.description,
                provider: response,
            });
        }

        if (
            response.status !== "Approved" &&
            response.status !== "SUCCESS"
        ) {
            return res.status(400).json({
                success: false,
                message: "Education purchase failed",
                provider: response,
            });
        }

        /*
        |--------------------------------------------------------------------------
        | Debit Wallet
        |--------------------------------------------------------------------------
        */

        const updatedWallet = await db.debitWallet(
            req.user.id,
            amountToCharge
        );

        const reference = `EDU${Date.now()}`;

        /*
        |--------------------------------------------------------------------------
        | Save Transaction
        |--------------------------------------------------------------------------
        */

        const txn = await db.createTransaction({
            userId: req.user.id,
            type: "debit",
            category: "education",
            title: product.name,
            amount: amountToCharge,
            status: "successful",
            icon: "school",
            reference,
            meta: {
                eduType,
                token: response.token,
                providerReference: response.trans_id,
                providerResponse: response,
            },
        });

        /*
        |--------------------------------------------------------------------------
        | Success
        |--------------------------------------------------------------------------
        */

        return res.json({
            success: true,
            message: "Education PIN purchased successfully",
            data: {
                wallet: updatedWallet,
                transaction: txn,
                reference,
                token: response.token,
                provider: response,
            },
        });

    } catch (err) {

        console.error(err);

        return res.status(500).json({
            success: false,
            message: err.message,
        });

    }

};
// GET /api/services/data/plans/:network
exports.getDataPlans = async (req, res) => {
    try {

        const plans = await subAndGain.getDataPlans(
            req.params.network
        );

        return res.json({
            success: true,
            data: plans,
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message,
        });

    }
};
// GET /api/services/cable/packages/:service
exports.getCablePackages = async (req, res) => {
    try {

        const packages = await subAndGain.getCablePackages(
            req.params.service
        );

        return res.json({
            success: true,
            data: packages,
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message,
        });

    }
};
// POST /api/services/cable/verify
exports.verifyCable = async (req, res) => {

    try {

        const {
            service,
            smartNumber,
        } = req.body;

        const customer = await subAndGain.verifyCable({
            service,
            smartNumber,
        });

        return res.json({
            success: true,
            data: customer,
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message,
        });

    }

};
// POST /api/services/electricity/verify
exports.verifyMeter = async (req, res) => {

    try {

        const {
            service,
            meterNumber,
            meterType,
        } = req.body;

        const customer = await subAndGain.verifyElectricity({
            service,
            meterNumber,
            meterType,
        });

        return res.json({
            success: true,
            data: customer,
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message,
        });

    }

};
// GET /api/services/education/products
exports.getEducationProducts = async (req, res) => {

    try {

        const products = await subAndGain.getEducationProducts();

        return res.json({
            success: true,
            data: products,
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message,
        });

    }

};
// GET /api/services/networks
exports.getNetworks = async (req, res) => {
    try {
        return res.json({
            success: true,
            data: [
                { code: "MTN", name: "MTN" },
                { code: "Airtel", name: "Airtel" },
                { code: "Glo", name: "Glo" },
                { code: "9Mobile", name: "9Mobile" },
            ],
        });
    } catch (err) {
        return res.status(500).json({
            success: false,
            message: err.message,
        });
    }
};
// GET /api/services/electricity/discos
exports.getDiscos = async (req, res) => {
    try {

        const discos = await subAndGain.getDiscos();

        return res.json({
            success: true,
            data: discos,
        });

    } catch (err) {

        return res.status(400).json({
            success: false,
            message: err.message,
        });

    }
};