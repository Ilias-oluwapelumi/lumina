const db = require('../config/db');         // ← one ../
//const vtpass = require('../services/vtpass'); 
const subAndGain = require('../services/subandgain.service');
console.log(subAndGain);// ← one ../

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
        message: "Network, phone and amount (minimum ₦50) are required"
      });
    }

    // Check wallet balance first
    const currentWallet = await db.getWallet(req.user.id);

    if (!currentWallet) {
      return res.status(404).json({
        success: false,
        message: "Wallet not found"
      });
    }

    if (currentWallet.balance < Number(amount)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance"
      });
    }

    // Call SubAndGain
    const response = await subAndGain.buyAirtime({
      network,
      phone,
      amount: Number(amount),
    });

    console.log("SubAndGain Response:", response);

    // Only continue if provider approved
    if (
      response.status !== "Approved" &&
      response.status !== "SUCCESS"
    ) {

      console.log("FULL SUBANDGAIN RESPONSE");
      console.log(response);
      return res.status(400).json({
        success: false,
        message: response.message || "Airtime purchase failed",
        provider: response
      });
    }

    // Debit wallet
    const wallet = await db.debitWallet(
      req.user.id,
      Number(amount)
    );

    // Create our own reference
    const reference = `AIR${Date.now()}`;

    const txn = await db.createTransaction({
      userId: req.user.id,
      type: "debit",
      category: "airtime",
      title: `Airtime - ${network}`,
      amount: Number(amount),
      status: "successful",
      icon: "phone_android",
      reference,

      meta: {
        network,
        phone,
        providerReference:
          response.trans_id || null,
        providerResponse: response,
      },
    });

    return res.json({
      success: true,
      message: "Airtime purchased successfully",
      data: {
        wallet,
        transaction: txn,
        provider: response
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

    // Debit wallet using provider price if available
    const updatedWallet = await db.debitWallet(
    req.user.id,
   Number(amount),
); 

    const reference = `DATA${Date.now()}`;

    const txn = await db.createTransaction({
      userId: req.user.id,
      type: "debit",
      category: "data",
      title: `Data - ${response.network} ${response.dataPlan}`,
      amount,
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

        // Get wallet
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

        // Correct amount from backend
        const amount = selectedPackage.price;

        // Check wallet balance
        if (wallet.balance < amount) {
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
            amount,
        });

        // Purchase from provider
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

        // Debit wallet
        const updatedWallet = await db.debitWallet(
            req.user.id,
            amount
        );

        const reference = `CABLE${Date.now()}`;

        const txn = await db.createTransaction({
            userId: req.user.id,
            type: "debit",
            category: "cable",
            title: `${response.service} - ${response.package}`,
            amount,
            status: "successful",
            icon: "tv",
            reference,
            meta: {
                service,
                bills_code,
                smartNumber,
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
    const { meterNumber, disco, meterType } = req.body;
    if (!meterNumber || !disco) return res.status(400).json({ success: false, message: 'Meter number and DISCO required' });
    const result = await vtpass.verifyMeter({ meterNumber, disco, meterType });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// POST /api/services/electricity/pay
exports.payElectricity = async (req, res) => {
  try {
    const { meterNumber, disco, meterType, amount, phone } = req.body;
    if (!meterNumber || !disco || !amount || amount < 500) {
      return res.status(400).json({ success: false, message: 'All fields required. Minimum ₦500' });
    }
    const result = await vtpass.payElectricity({ meterNumber, disco, meterType, amount: parseFloat(amount), phone: phone || req.user.phone });
    const wallet = await db.debitWallet(req.user.id, parseFloat(amount));
    const ref = `ELEC${Date.now()}`;
    const txn = await db.createTransaction({
      userId: req.user.id, type: 'debit', category: 'electricity',
      title: `${disco} – ${meterType}`, amount: parseFloat(amount),
      status: 'successful', icon: 'bolt', reference: ref,
      meta: { meterNumber, disco, meterType, token: result.token },
    });
    res.json({ success: true, message: `Token: ${result.token}. ₦${Number(amount).toLocaleString()} paid to ${disco}`, data: { wallet, transaction: txn, token: result.token, reference: ref } });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
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