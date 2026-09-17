const { v4: uuidv4 } = require('uuid');
const { sendServerError } = require('../utils/errors');
const logger = require('../utils/logger');
const db = require('../config/db');
const heedpay = require('../services/heedpay');

// POST /api/wallet/fund/initialize
exports.initializeFunding = async (req, res) => {
  try {
    const user = req.user;

    // Check if user already has a virtual account
    let vda = await db.getVirtualAccount(user.id);

    if (!vda) {
      // Create new STATIC account for this user
      const refId = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${user.id.slice(0, 8).toUpperCase()}`;

      // Use BVN from environment or user profile
      const bvn = process.env.TEST_BVN || '';

      const accountData = await heedpay.createVirtualAccount({
        refId,
        email: user.email,
        accountName: user.fullName,
        phoneNumber: user.phone,
        bvn,
        businessId: process.env.HEEDPAY_BUSINESS_ID,
        apiKey: process.env.HEEDPAY_API_KEY, // <-- FIXED: Use HEEDPAY_API_KEY here
      });

      // Save to database
      vda = {
        accountNumber: accountData.virtualNumber,
        bankName: accountData.bankName,
        accountName: accountData.virtualName,
        refId,
        createdAt: new Date(),
      };

      await db.setVirtualAccount(user.id, vda);
      console.log('New virtual account created:', vda);
    }

    res.json({
      success: true,
      data: {
        accountNumber: vda.accountNumber,
        bankName: vda.bankName,
        accountName: vda.accountName,
        instruction: `Transfer any amount to this account. Your wallet will be credited automatically.`,
      },
    });
  } catch (err) {
    console.error('initializeFunding error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
};

// GET /api/wallet/fund/account
exports.getFundingAccount = async (req, res) => {
  try {
    const vda = await db.getVirtualAccount(req.user.id);

    if (!vda) {
      return res.status(400).json({
        success: false,
        message: 'No virtual account created yet',
      });
    }

    res.json({
      success: true,
      data: {
        accountNumber: vda.accountNumber,
        bankName: vda.bankName,
        accountName: vda.accountName,
      },
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};