const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Company = require('../models/Company');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../utils/response');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
};

class AuthController {
  /**
   * Register new company and first administrator account
   */
  async register(req, res, next) {
    try {
      const { name, email, companyName, password } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return errorResponse(res, 'An account with this email address already exists.', 409);
      }

      // Create company
      const company = await Company.create({
        name: companyName,
      });

      // Create admin user
      const user = await User.create({
        name,
        email,
        password,
        role: 'ADMIN',
        companyId: company._id,
      });

      const token = generateToken(user);

      return successResponse(
        res,
        {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: company._id,
            companyName: company.name,
          },
        },
        'Registration successful! Welcome to InvoScan.',
        201
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * User login
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password').populate('companyId', 'name defaultCurrency gstin');
      if (!user) {
        return errorResponse(res, 'Invalid email or password.', 401);
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return errorResponse(res, 'Invalid email or password.', 401);
      }

      if (!user.isActive) {
        return errorResponse(res, 'Your account has been deactivated. Contact your administrator.', 403);
      }

      user.lastLogin = new Date();
      await user.save();

      const token = generateToken(user);

      return successResponse(
        res,
        {
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            companyId: user.companyId?._id,
            companyName: user.companyId?.name || 'InvoScan Workspace',
            defaultCurrency: user.companyId?.defaultCurrency || 'INR',
          },
        },
        'Login successful.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user
   */
  async getMe(req, res, next) {
    try {
      const user = await User.findById(req.user._id).populate('companyId', 'name address gstin defaultCurrency financialYearStart settings');
      if (!user) {
        return errorResponse(res, 'User not found.', 404);
      }

      return successResponse(res, {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.companyId,
        companyId: user.companyId?._id,
        companyName: user.companyId?.name,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user._id).select('+password');

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return errorResponse(res, 'Current password is incorrect.', 400);
      }

      user.password = newPassword;
      await user.save();

      return successResponse(res, null, 'Password updated successfully.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout
   */
  async logout(req, res) {
    return successResponse(res, null, 'Logged out successfully.');
  }
}

module.exports = new AuthController();
