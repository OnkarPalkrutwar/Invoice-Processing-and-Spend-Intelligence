const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/invoice_spend_intelligence',
  jwtSecret: process.env.JWT_SECRET || 'invo_spend_intelligence_super_secret_key_2026_jwt',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  ocrServiceUrl: process.env.OCR_SERVICE_URL || 'http://localhost:8000',
  uploadDir: path.resolve(__dirname, '../', process.env.UPLOAD_DIR || 'uploads'),
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10),
};
