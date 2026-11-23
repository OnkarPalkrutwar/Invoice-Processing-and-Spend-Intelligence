const { errorResponse } = require('../utils/response');

/**
 * Role-based authorization middleware
 * @param  {...string} roles Allowed roles ('ADMIN', 'FINANCE_MANAGER', 'EMPLOYEE')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return errorResponse(res, 'Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return errorResponse(
        res,
        `Access denied. Role '${req.user.role}' does not have sufficient permissions.`,
        403
      );
    }

    next();
  };
};

module.exports = { authorize };
