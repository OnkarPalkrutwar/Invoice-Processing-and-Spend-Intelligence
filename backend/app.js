const express = require('express');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const corsMiddleware = require('./config/cors');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const vendorRoutes = require('./routes/vendorRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();

// Security headers allowing iframe embedding from the frontend and cross-origin resource policy
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    frameguard: false,
    contentSecurityPolicy: false,
  })
);

// CORS
app.use(corsMiddleware);

// Request body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logger
if (env.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded documents statically with permissive frame and embedding headers
app.use(
  '/uploads',
  (req, res, next) => {
    res.removeHeader('X-Frame-Options');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
  },
  express.static(env.uploadDir, {
    setHeaders: (res, filePath) => {
      res.removeHeader('X-Frame-Options');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (filePath.endsWith('.pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
      }
    },
  }),
  // Graceful fallback when a previously uploaded file is missing from disk (e.g. after cloud redeployment)
  (req, res) => {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 90vh; margin: 0; background: #f8fafc; color: #475569; text-align: center; }
            .card { background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e2e8f0; max-width: 400px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            h3 { color: #0f172a; margin-top: 0; font-size: 1rem; }
            p { font-size: 0.85rem; line-height: 1.5; color: #64748b; }
            .badge { display: inline-block; padding: 0.25rem 0.5rem; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 0.75rem; font-weight: 600; margin-bottom: 0.75rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">Cloud Ephemeral Storage Notice</div>
            <h3>Document File Unavailable</h3>
            <p>This file was uploaded during an earlier server deployment. On Render's free tier, local disk storage clears when a new version is deployed.</p>
            <p style="margin-bottom:0">All extracted invoice numbers, itemized line items, and audit data remain <strong>100% safely preserved</strong> in your MongoDB Atlas cloud database.</p>
          </div>
        </body>
      </html>
    `);
  }
);

// Rate limit on sensitive auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // Limit each IP to 100 requests per 15 mins
  message: { success: false, message: 'Too many login attempts. Please try again later.' },
});
app.use('/api/auth/login', authLimiter);

// API Health Check with live OCR connectivity probe
app.get('/api/health', async (req, res) => {
  let ocrStatus = 'unknown';
  let ocrError = null;
  try {
    const axios = require('axios');
    const ocrProbe = await axios.get(`${env.ocrServiceUrl}/health`, { timeout: 6000 });
    ocrStatus = ocrProbe.data?.status || 'operational';
  } catch (err) {
    ocrStatus = 'unreachable';
    ocrError = err.message;
  }

  res.status(200).json({
    success: true,
    message: 'InvoScan Invoice Processing and Spend Intelligence API is operational.',
    ocrService: {
      configuredUrl: env.ocrServiceUrl,
      status: ocrStatus,
      error: ocrError,
    },
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);

// 404 & Centralized Error Handler
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
