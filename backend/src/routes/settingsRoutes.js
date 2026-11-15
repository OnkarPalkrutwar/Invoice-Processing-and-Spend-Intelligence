const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const User = require('../models/User');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { successResponse, errorResponse } = require('../utils/response');

router.use(authenticate);

// Get company & user settings
router.get('/', async (req, res, next) => {
  try {
    const [company, user] = await Promise.all([
      Company.findById(req.companyId),
      User.findById(req.user._id),
    ]);
    return successResponse(res, { company, user }, 'Settings loaded.');
  } catch (error) {
    next(error);
  }
});

// Update company profile (ADMIN only)
router.put('/company', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, address, gstin, phone, email, defaultCurrency, financialYearStart } = req.body;
    const company = await Company.findById(req.companyId);
    if (!company) return errorResponse(res, 'Company not found.', 404);

    if (name) company.name = name.trim();
    if (address !== undefined) company.address = address.trim();
    if (gstin !== undefined) company.gstin = gstin.trim().toUpperCase();
    if (phone !== undefined) company.phone = phone.trim();
    if (email !== undefined) company.email = email.trim().toLowerCase();
    if (defaultCurrency) company.defaultCurrency = defaultCurrency;
    if (financialYearStart) company.financialYearStart = financialYearStart;

    await company.save();
    return successResponse(res, company, 'Company profile updated successfully.');
  } catch (error) {
    next(error);
  }
});

// Update user profile
router.put('/profile', async (req, res, next) => {
  try {
    const { name, profilePicture } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return errorResponse(res, 'User not found.', 404);

    if (name) user.name = name.trim();
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    await user.save();
    return successResponse(res, user, 'Profile updated successfully.');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
