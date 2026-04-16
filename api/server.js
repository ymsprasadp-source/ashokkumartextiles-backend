import express from 'express';
import cors from 'cors';

import healthHandler from './health.js';
import razorpayStatusHandler from './razorpay-status.js';
import createOrderHandler from './create-order.js';
import verifyPaymentHandler from './verify-payment.js';
import sendOrderConfirmationHandler from './send-order-confirmation.js';
import adminOrdersHandler from './admin-orders.js';
import updateOrderStatusHandler from './update-order-status.js';
import adminProductImagesHandler from './admin-product-images.js';
import adminProductsHandler from './admin-products.js';
import sendAdminEmailHandler from './send-admin-email.js';
import sendCustomerEmailHandler from './send-customer-email.js';
import sendEmailHandler from './send-email.js';
import webhookHandler from './webhook.js';

const app = express();
app.disable('x-powered-by');

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://localhost:3000',
  'https://ashokkumartextiles-frontend.vercel.app',
  'https://www.ashokkumartextiles.com',
  'https://ashokkumartextiles.com',
]);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS origin blocked: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token', 'Accept'],
  credentials: true,
  maxAge: 86400,
};

app.use('/api', cors(corsOptions));
app.options(/\/api\/.*/, cors(corsOptions));
app.use(express.json({ limit: '2mb' }));

app.all('/api/health', healthHandler);
app.all('/api/razorpay-status', razorpayStatusHandler);
app.all('/api/create-order', createOrderHandler);
app.all('/api/verify-payment', verifyPaymentHandler);
app.all('/api/send-order-confirmation', sendOrderConfirmationHandler);
app.all('/api/admin-orders', adminOrdersHandler);
app.all('/api/update-order-status', updateOrderStatusHandler);
app.all('/api/admin-product-images', adminProductImagesHandler);
app.all('/api/admin-products', adminProductsHandler);
app.all('/api/send-admin-email', sendAdminEmailHandler);
app.all('/api/send-customer-email', sendCustomerEmailHandler);
app.all('/api/send-email', sendEmailHandler);
app.all('/api/webhook', webhookHandler);

app.all(/\/api\/.*/, (req, res) => {
  res.status(404).json({
    error: 'API route not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

app.use((error, req, res, next) => {
  if (error && error.message?.startsWith('CORS origin blocked:')) {
    return res.status(403).json({
      error: 'CORS origin not allowed',
      origin: req.headers.origin || null,
    });
  }
  return next(error);
});

export default app;
