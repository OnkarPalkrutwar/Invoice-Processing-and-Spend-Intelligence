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

// Get all team members for current organization (ADMIN only)
router.get('/users', authorize('ADMIN'), async (req, res, next) => {
  try {
    const users = await User.find({ companyId: req.companyId })
      .select('-password')
      .sort({ createdAt: -1 });
    return successResponse(res, users, 'Team members retrieved.');
  } catch (error) {
    next(error);
  }
});

// Create new team member (ADMIN only)
router.post('/users', authorize('ADMIN'), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'Full name, email, and password are required.', 400);
    }

    if (password.length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters long.', 400);
    }

    const validRoles = ['ADMIN', 'FINANCE_MANAGER', 'EMPLOYEE'];
    const assignedRole = role && validRoles.includes(role) ? role : 'EMPLOYEE';

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return errorResponse(res, 'An account with this email address already exists.', 409);
    }

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: assignedRole,
      companyId: req.companyId,
    });

    const userObj = newUser.toObject();
    delete userObj.password;

    const roleLabel =
      assignedRole === 'FINANCE_MANAGER'
        ? 'Finance Manager'
        : assignedRole === 'ADMIN'
        ? 'Administrator'
        : 'Employee';

    return successResponse(res, userObj, `${roleLabel} created successfully.`, 201);
  } catch (error) {
    next(error);
  }
});

// Delete team member (ADMIN only)
router.delete('/users/:id', authorize('ADMIN'), async (req, res, next) => {
  try {
    const userToDelete = await User.findOne({
      _id: req.params.id,
      companyId: req.companyId,
    });

    if (!userToDelete) {
      return errorResponse(res, 'Team member not found in your organization.', 404);
    }

    if (userToDelete._id.toString() === req.user._id.toString()) {
      return errorResponse(res, 'You cannot delete your own admin account.', 400);
    }

    await User.deleteOne({ _id: userToDelete._id });
    return successResponse(res, null, 'Team member removed successfully.');
  } catch (error) {
    next(error);
  }
});

module.exports = router;
