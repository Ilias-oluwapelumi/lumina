const db = require('../config/db');         // ← one ../
//const vtpass = require('../services/vtpass'); 
const subAndGain = require('../services/subandgain.service');
console.log(subAndGain);// ← one ../
const pricing = require('../config/pricing');

// GET /api/services/networks
exports.getNetworks = (_req, res) => {
  res.json({
    success: true,
    data: { networks: ['MTN', 'Airtel', 'Glo', '9Mobile'] },
  });
};

// GET /api/services/electricity/discos
exports.getDiscos = (_req, res) => {
  res.json({
    success: true,
    data: { discos: ['IKEDC', 'EKEDC', 'AEDC', 'PHED', 'IBEDC', 'KEDCO', 'JEDC', 'BEDC'] },
  });
};

// POST /api/services/airtime
exports.buyAirtime = async (req, res) => {

  console.log("===== BUY AIRTIME CONTROLLER HIT =====");

  try {

    const { network, phone, amount } = req.body;

    if (!network || !phone || !amount || Number(amount) < 50) {
      return res.status(400).json({
        success: false,
        message: "Network, phone and amount (minimum ₦50) are required",
      });
    }

    // Provider amount
    const providerAmount = Number(amount);

    // Customer amount (includes your profit)
   const amountToCharge = Number(amount) + profit.airtime;

    // Check wallet
    const currentWallet = await db.getWallet(req.user.id);

    if (!currentWallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    if (currentWallet.balance < amountToCharge) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    // Buy from SubAndGain using ORIGINAL amount
    const response = await subAndGain.buyAirtime({
      network,
      phone,
      amount: providerAmount,
    });

    console.log("SubAndGain Response:");
    console.log(response);

    // Provider returned an error
    if (response.error || response.code) {
      return res.status(400).json({
        success: false,
        message:
          response.description ||
          response.message ||
          "Airtime purchase failed",
        provider: response,
      });
    }

    // Provider didn't approve
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

    // Debit customer's wallet
    const wallet = await db.debitWallet(
      req.user.id,
      amountToCharge
    );

    const reference = `AIR${Date.now()}`;

    // Save transaction
    const txn = await db.createTransaction({
      userId: req.user.id,
      type: "debit",
      category: "airtime",
      title: `Airtime - ${network}`,
      amount: amountToCharge,
      status: "successful",
      icon: "phone_android",
      reference,
      meta: {
        network,
        phone,
        providerAmount,
        chargedAmount: amountToCharge,
        profit: pricing.airtime,
        providerReference: response.trans_id,
        providerResponse: response,
      },
    });

    return res.json({
      success: true,
      message: "Airtime purchased successfully",
      data: {
        wallet,
        transaction: txn,
        reference,
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

// GET /api/services/data/plans
exports.getDataPlans = async (req, res) => {
  try {

    const { network } = req.query;

    const plans = await subAndGain.getDataPlans(network);

    return res.json({
      success: true,
      data: {
        network,
        plans,
      },
    });

  } catch (err) {

    return res.status(400).json({
      success: false,
      message: err.message,
    });

  }
};

// POST /api/services/data
exports.buyData = async (req, res) => {
  console.log("===== BUY DATA CONTROLLER HIT =====");

  try {

    const {
      network,
      phone,
      dataPlan
    } = req.body;

    if (!network || !phone || !dataPlan) {
      return res.status(400).json({
        success: false,
        message: "Network, phone and dataPlan are required"
      });
    }

    // Check wallet
    const wallet = await db.getWallet(req.user.id);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }
    console.log("NETWORK =", network);
console.log("DATAPLAN =", dataPlan);
console.log("PHONE =", phone);


    // Buy from SubAndGain
    const response = await subAndGain.buyData({
      network,
      phone,
      dataPlan,
    });

    console.log("FULL SUBANDGAIN DATA RESPONSE");
    console.log(response);

    // Handle API errors
    if (response.error || response.code) {
      return res.status(400).json({
        success: false,
        message:
          response.description ||
          response.message ||
          "Data purchase failed",
        provider: response
      });
    }

    // Success check
    if (
      response.status !== "Approved" &&
      response.status !== "SUCCESS"
    ) {
      return res.status(400).json({
        success: false,
        message: "Data purchase failed",
        provider: response
      });
    }

   // Provider price
const providerAmount = Number(response.amount || 0);

// Add your profit
const amountToCharge = providerPrice + profit.data;

// Debit customer's wallet
const updatedWallet = await db.debitWallet(
    req.user.id,
    amountToCharge
);

const reference = `DATA${Date.now()}`;

const txn = await db.createTransaction({
  userId: req.user.id,
  type: "debit",
  category: "data",
  title: `Data - ${response.network} ${response.dataPlan}`,
  amount: amountToCharge  ,
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
      }
    });

  } catch (err) {

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message
    });

  }
};

// GET /api/services/cable/packages
exports.getCablePackages = async (req, res) => {
  try {

    const { service } = req.query;

    const packages = await subAndGain.getCablePackages(service);

    return res.json({
      success: true,
      data: {
        service,
        packages,
      },
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

    const { service, smartNumber } = req.body;

    if (!service || !smartNumber) {
      return res.status(400).json({
        success: false,
        message: "Service and Smart Number are required",
      });
    }

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

// POST /api/services/cable
exports.buyCable = async (req, res) => {

    console.log("===== BUY CABLE CONTROLLER HIT =====");

    try {

        const {
            service,
            bills_code,
            smartNumber,
        } = req.body;

        if (!service || !bills_code || !smartNumber) {
            return res.status(400).json({
                success: false,
                message: "service, bills_code and smartNumber are required",
            });
        }

        // Get user's wallet
        const wallet = await db.getWallet(req.user.id);

        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Wallet not found",
            });
        }

        // Get packages from SubAndGain
        const packages = await subAndGain.getCablePackages(service);

        // Find selected package
        const selectedPackage = packages.find(
            p => p.code === bills_code
        );

        if (!selectedPackage) {
            return res.status(400).json({
                success: false,
                message: "Invalid cable package",
            });
        }

        // Provider price
        const providerAmount = Number(selectedPackage.price);

        // YOUR SELLING PRICE (+₦100 profit)
        const amountToCharge = providerPrice + profit.cable;

        // Check wallet balance
        if (wallet.balance < amountToCharge) {
            return res.status(400).json({
                success: false,
                message: "Insufficient wallet balance",
            });
        }

        console.log("BUYING CABLE");
        console.log({
            service,
            bills_code,
            smartNumber,
            providerAmount,
            amountToCharge,
        });

        // Purchase from SubAndGain
        const response = await subAndGain.buyCable({
            service,
            bills_code,
            smartNumber,
        });

        console.log("SUBANDGAIN RESPONSE");
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

        // Debit wallet using YOUR selling price
        const updatedWallet = await db.debitWallet(
            req.user.id,
            amountToCharge
        );

        const reference = `CABLE${Date.now()}`;

        const txn = await db.createTransaction({
            userId: req.user.id,
            type: "debit",
            category: "cable",
            title: `${response.service} - ${response.package}`,
            amount: amountToCharge,
            status: "successful",
            icon: "tv",
            reference,
            meta: {
                service,
                bills_code,
                smartNumber,
                providerAmount,
                profit: 100,
                providerReference: response.trans_id,
                providerResponse: response,
            },
        });

        return res.json({
            success: true,
            message: "Cable subscription successful",
            data: {
                wallet: updatedWallet,
                transaction: txn,
                reference,
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

// POST /api/services/electricity/verify
exports.verifyMeter = async (req, res) => {
  try {

    const {
      disco,
      meterNumber,
      meterType,
    } = req.body;

    if (!disco || !meterNumber || !meterType) {
      return res.status(400).json({
        success: false,
        message: "Disco, meter number and meter type are required",
      });
    }

    const customer = await subAndGain.verifyElectricity({
      service: disco,
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

/// POST /api/services/electricity/pay
exports.payElectricity = async (req, res) => {

  console.log("===== PAY ELECTRICITY CONTROLLER HIT =====");

  try {

    const {
      disco,
      meterNumber,
      meterType,
      accessToken,
      amount,
    } = req.body;

    if (
      !disco ||
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

    const providerAmount = Number(amount);

    if (providerAmount < 1000) {
      return res.status(400).json({
        success: false,
        message: "Minimum amount is ₦1000",
      });
    }

    // Your profit
    const amountToCharge = providerAmount + 100;

    // Wallet
    const wallet = await db.getWallet(req.user.id);

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found",
      });
    }

    if (wallet.balance < amountToCharge) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    console.log({
      disco,
      meterNumber,
      meterType,
      accessToken,
      providerAmount,
      amountToCharge,
    });

    // Buy from SubAndGain
    const response = await subAndGain.payElectricity({
      service: disco,
      meterNumber,
      meterType,
      accessToken,
      amount: providerAmount,
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

    // Debit wallet
    const updatedWallet = await db.debitWallet(
      req.user.id,
      amountToCharge
    );

    const reference = `ELEC${Date.now()}`;

    const txn = await db.createTransaction({
      userId: req.user.id,
      type: "debit",
      category: "electricity",
      title: response.service,
      amount: amountToCharge,
      status: "successful",
      icon: "bolt",
      reference,
      meta: {
        disco,
        meterNumber,
        meterType,
        accessToken,
        providerReference: response.trans_id,
        meterToken: response.MeterToken,
        providerResponse: response,
      },
    });

    return res.json({
      success: true,
      message: "Electricity purchase successful",
      data: {
        wallet: updatedWallet,
        transaction: txn,
        token: response.MeterToken,
        reference,
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

// POST /api/services/betting
exports.fundBetting = async (req, res) => {
  try {
    const { platform, userId, amount } = req.body;
    if (!platform || !userId || !amount || amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Platform, user ID and amount (min ₦100) required'
      });
    }
    // Debit wallet
    const wallet = await db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `BET${Date.now()}`;
    const txn = await db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'betting',
      title: `${platform} Wallet Funding`,
      amount: parseFloat(amount),
      status: 'successful',
      icon: 'sports_soccer',
      reference: ref,
      meta: { platform, userId },
    });
    res.json({
      success: true,
      message: `₦${Number(amount).toLocaleString()} sent to your ${platform} wallet`,
      data: { wallet, transaction: txn, reference: ref },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// POST /api/services/education
exports.purchaseEducation = async (req, res) => {
  try {
    const { service, type, quantity, amount } = req.body;
    if (!service || !type || !quantity || !amount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    const wallet = await db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `EDU${Date.now()}`;

    // Generate pins
    const pins = Array.from({ length: quantity }, () => ({
      pin: Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString(),
      serial: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
    }));

    const txn = await db.createTransaction({
      userId: req.user.id,
      type: 'debit',
      category: 'education',
      title: `${service} ${type} x${quantity}`,
      amount: parseFloat(amount),
      status: 'successful',
      icon: 'school',
      reference: ref,
      meta: { service, type, quantity, pins },
    });
    res.json({
      success: true,
      message: `${quantity} ${service} ${type} pin${quantity > 1 ? 's' : ''} purchased successfully`,
      data: { wallet, transaction: txn, reference: ref, pins },
    });
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