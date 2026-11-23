const app = require('./app');
const env = require('./config/env');
const { connectDatabase } = require('./config/database');

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    const server = app.listen(env.port, () => {
      console.log(`======================================================`);
      console.log(`  InvoScan Backend API Server Running`);
      console.log(`  Environment: ${env.nodeEnv}`);
      console.log(`  URL:         http://localhost:${env.port}`);
      console.log(`  Health Check:http://localhost:${env.port}/api/health`);
      console.log(`======================================================`);
    });

    const shutdown = async () => {
      console.log('\nGracefully shutting down server...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Fatal startup error:', error.message);
    process.exit(1);
  }
};

startServer();
