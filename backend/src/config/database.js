const mongoose = require('mongoose');
const env = require('./env');

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection failed:`, error.message);
    // Don't kill process immediately in dev so app can log meaningful health status
    throw error;
  }
};

module.exports = { connectDatabase };
