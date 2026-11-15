const { errorResponse } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error('[Error caught by global handler]:', err);

  // Multer file upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return errorResponse(res, 'File size exceeds the 10MB maximum limit.', 400);
    }
    return errorResponse(res, `Upload error: ${err.message}`, 400);
  }

  // File type filter error
  if (err.message && err.message.includes('Invalid file format')) {
    return errorResponse(res, err.message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val) => val.message);
    return errorResponse(res, `Validation error: ${messages.join(', ')}`, 400, messages);
  }

  // Mongoose duplicate key error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return errorResponse(res, `A record with this ${field} already exists.`, 409);
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, `Invalid ID format for resource: ${err.value}`, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, 'Invalid authentication token.', 401);
  }

  // Default server error
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : (process.env.NODE_ENV === 'production' ? 'An internal server error occurred.' : err.message || 'Internal Server Error');

  return errorResponse(res, message, statusCode);
};

const notFoundHandler = (req, res, next) => {
  return errorResponse(res, `API route not found: ${req.method} ${req.originalUrl}`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
