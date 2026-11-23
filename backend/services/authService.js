const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');

class AuthService {
  generateToken(user) {
    return jwt.sign(
      {
        userId: user._id,
        role: user.role,
        companyId: user.companyId,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );
  }

  async validateCredentials(email, password) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return null;
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return null;
    return user;
  }
}

module.exports = new AuthService();
