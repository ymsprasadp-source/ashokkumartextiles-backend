import 'dotenv/config';
import express from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';
import { sendOrderEmails } from './emailService.js';

const app = express();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'https://ashok-textiles.vercel.app',
    'https://*.vercel.app',
    'https://textiles2.vercel.app',
    'https://www.ashokkumartextiles.com',
    'https://ashokkumartextiles-frontend.vercel.app',
    'https://ashokkumartextiles-backend.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-token']
}));
app.use(express.json());

// Initialize Razorpay
let razorpay = null;
try {
  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.error('❌ Razorpay credentials not found in environment variables');
    console.log('Please check your .env file for RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET');
  } else {
    razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    console.log('✅ Razorpay initialized successfully');
  }
} catch (error) {
  console.error('❌ Error initializing Razorpay:', error.message);
}

const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
const currentMode = keyId?.startsWith('rzp_live') ? 'LIVE' : 'TEST';

// ─── Health Check ─────────────────────────────────────────────────────────────
// FIX: Was defined twice. Merged both into one handler that checks Gmail too.
app.get('/api/health', (req, res) => {
  const gmailUser = process.env.GMAIL_USER;
  const gmailPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPassword) {
    return res.status(500).json({
      status: 'error',
      service: 'gmail-email-service',
      timestamp: new Date().toISOString(),
      message: 'Gmail credentials not configured',
      details: {
        gmail_user: !!gmailUser,
        gmail_password: !!gmailPassword
      }
    });
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPassword },
    tls: { rejectUnauthorized: false }
  });

  transporter.verify((error) => {
    if (error) {
      console.error('❌ Gmail health check failed:', error);
      let errorMessage = 'Gmail service health check failed';
      if (error.code === 'EAUTH') errorMessage = 'Gmail authentication failed';
      else if (error.code === 'ENOTFOUND') errorMessage = 'Network connectivity issue';

      return res.status(500).json({
        status: 'error',
        service: 'gmail-email-service',
        timestamp: new Date().toISOString(),
        message: errorMessage,
        error: error.message
      });
    }

    res.status(200).json({
      status: 'OK',
      message: 'Server is running',
      timestamp: new Date().toISOString(),
      mode: currentMode,
      service: '3rd-client-payment-server',
      version: '2.0.0',
      gmail: {
        status: 'ok',
        gmail_user: gmailUser,
        smtp_ready: true
      }
    });
  });
});

// ─── Root ──────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Hello from backend!');
});

// ─── Razorpay Status ───────────────────────────────────────────────────────────
app.get('/api/razorpay-status', (req, res) => {
  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const hasSecret = !!process.env.RAZORPAY_KEY_SECRET;

  res.json({
    mode: currentMode,
    keyIdPrefix: keyId ? keyId.substring(0, 8) + '...' : 'NOT_SET',
    hasSecret,
    status: keyId && hasSecret ? 'CONFIGURED' : 'MISCONFIGURED',
    timestamp: new Date().toISOString(),
    service: 'razorpay-payment-gateway',
    version: '1.0.0'
  });
});

// ─── Create Razorpay Order ─────────────────────────────────────────────────────
app.post('/api/create-order', async (req, res) => {
  console.log('📦 Create order request received:', {
    amount: req.body.amount,
    currency: req.body.currency,
    timestamp: new Date().toISOString()
  });

  try {
    if (!razorpay) throw new Error('Razorpay not initialized. Check your credentials.');

    const { amount, currency = 'INR', customer_details, order_metadata, receipt, notes } = req.body;

    if (!amount || !Number.isInteger(amount) || amount < 100) {
      return res.status(400).json({
        error: 'Invalid amount. Must be integer paise and at least 100 (₹1).'
      });
    }

    const orderOptions = {
      amount: Math.round(amount),
      currency,
      receipt: receipt || `rcpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      payment_capture: 1,
      notes: {
        source: '3rd-client',
        environment: currentMode,
        created_at: new Date().toISOString(),
        ...notes,
        ...order_metadata
      }
    };

    if (customer_details) {
      if (customer_details.email) orderOptions.notes.customer_email = customer_details.email;
      if (customer_details.phone) orderOptions.notes.customer_phone = customer_details.phone;
    }

    console.log('🏗️ Creating Razorpay order:', {
      amount: orderOptions.amount,
      currency: orderOptions.currency,
      receipt: orderOptions.receipt
    });

    const order = await razorpay.orders.create(orderOptions);

    console.log('✅ Razorpay order created:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });

    res.json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      created_at: order.created_at
    });

  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);

    let statusCode = 500;
    let errorMessage = 'Failed to create payment order';

    if (error.statusCode) statusCode = error.statusCode;
    if (error.error?.description) errorMessage = error.error.description;
    else if (error.message) errorMessage = error.message;

    res.status(statusCode).json({
      error: errorMessage,
      code: error.error?.code || 'CREATE_ORDER_FAILED'
    });
  }
});

// ─── Verify Payment ────────────────────────────────────────────────────────────
app.post('/api/verify-payment', (req, res) => {
  console.log('🔐 Payment verification request received');

  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        valid: false,
        error: 'Missing required payment verification data',
        received: {
          razorpay_order_id: !!razorpay_order_id,
          razorpay_payment_id: !!razorpay_payment_id,
          razorpay_signature: !!razorpay_signature
        }
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ valid: false, error: 'Payment verification service not configured' });
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', keySecret).update(text).digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );

    console.log('🔐 Verification result:', { order_id: razorpay_order_id, payment_id: razorpay_payment_id, isValid });

    if (isValid) {
      res.json({
        valid: true,
        message: 'Payment verified successfully',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        verified_at: new Date().toISOString()
      });
    } else {
      res.status(400).json({ valid: false, error: 'Payment signature verification failed', code: 'INVALID_SIGNATURE' });
    }

  } catch (error) {
    console.error('❌ Payment verification error:', error);
    res.status(500).json({ valid: false, error: 'Payment verification service error', code: 'VERIFICATION_ERROR' });
  }
});

// ─── Test Endpoint ─────────────────────────────────────────────────────────────
app.post('/api/test', (req, res) => {
  console.log('🧪 Test endpoint called with body:', req.body);
  res.json({
    message: 'Test endpoint working',
    receivedData: req.body,
    timestamp: new Date().toISOString(),
    server: 'express-3rd-client'
  });
});

// ─── Send Email ────────────────────────────────────────────────────────────────
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;

    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, and html or text' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      tls: { rejectUnauthorized: false }
    });

    try {
      await transporter.verify();
      console.log('📧 Gmail SMTP server is ready');
    } catch (verifyError) {
      console.error('❌ Gmail SMTP verification failed:', verifyError);
      return res.status(500).json({ success: false, error: 'Email service configuration error.' });
    }

    const mailOptions = {
      from: { name: 'Ashok Kumar Textiles', address: process.env.GMAIL_USER },
      to, subject, html,
      text: text || 'Please enable HTML to view this email properly.',
      headers: { 'X-Mailer': 'Ashok Kumar Textiles Order System', 'X-Priority': '3', 'Importance': 'Normal' }
    };

    console.log('📧 Attempting to send email to:', to);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);

    res.status(200).json({ success: true, messageId: info.messageId, message: 'Email sent successfully via Gmail' });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    let errorMessage = 'Failed to send email';
    if (error.code === 'EAUTH') errorMessage = 'Gmail authentication failed.';
    else if (error.code === 'ENOTFOUND') errorMessage = 'Network error.';
    else if (error.code === 'ETIMEDOUT') errorMessage = 'Email sending timed out.';
    else if (error.responseCode === 535) errorMessage = 'Gmail authentication error. Verify app password.';

    res.status(500).json({ success: false, error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// ─── Test Email ────────────────────────────────────────────────────────────────
app.post('/api/test-email', async (req, res) => {
  try {
    const { email } = req.body;
    const testEmail = email || 'test@example.com';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(testEmail)) {
      return res.status(400).json({ error: 'Invalid email address format' });
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({ success: false, error: 'Gmail credentials not configured' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      tls: { rejectUnauthorized: false }
    });

    const testEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .footer { background: #333; color: white; padding: 15px; text-align: center; margin-top: 20px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧪 Test Email</h1>
            <p>Ashok Kumar Textiles - Email Service Test</p>
          </div>
          <div class="content">
            <h2>Email Service Working Successfully! ✅</h2>
            <p>This is a test email to verify Gmail + Nodemailer integration.</p>
            <div style="background: #e7f3ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
              <p><strong>📧 Email Details:</strong></p>
              <ul>
                <li>Service: Gmail SMTP</li>
                <li>Library: Nodemailer</li>
                <li>Sent at: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</li>
                <li>Test recipient: ${testEmail}</li>
              </ul>
            </div>
            <p>If you received this email, the email service is configured and working!</p>
          </div>
          <div class="footer">
            <p><strong>Ashok Kumar Textiles</strong></p>
            <p>Quality textiles for every occasion</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: { name: 'Ashok Kumar Textiles', address: process.env.GMAIL_USER },
      to: testEmail,
      subject: '🧪 Test Email - Ashok Kumar Textiles Email Service',
      html: testEmailHTML,
      text: `Test Email - Ashok Kumar Textiles\n\nGmail + Nodemailer integration test.\nSent at: ${new Date().toLocaleString()}`
    };

    console.log('📧 Sending test email to:', testEmail);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent:', info.messageId);

    res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${testEmail}`,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Test email failed:', error);
    let errorMessage = 'Failed to send test email';
    if (error.code === 'EAUTH') errorMessage = 'Gmail authentication failed.';
    else if (error.code === 'ENOTFOUND') errorMessage = 'Network error.';

    res.status(500).json({ success: false, error: errorMessage, details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// ─── Admin Order Notification Email ───────────────────────────────────────────
app.post('/api/send-admin-email', async (req, res) => {
  try {
    const { orderData } = req.body;

    if (!orderData || !orderData.id || !orderData.user_email) {
      return res.status(400).json({ error: 'Missing required order data (id, user_email)' });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const adminEmail = process.env.VITE_ADMIN_EMAIL || gmailUser;

    if (!gmailUser || !gmailPassword) {
      return res.status(500).json({ error: 'Email service not configured.' });
    }
    if (gmailUser === 'your-email@gmail.com' || gmailPassword === 'your-16-digit-app-password') {
      return res.status(500).json({ error: 'Email service not properly configured.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPassword },
      tls: { rejectUnauthorized: false }
    });

    const itemsHTML = orderData.items.map(item => {
      const details = [];
      if (item.fabric) details.push(`Fabric: ${item.fabric}`);
      if (item.category) details.push(`Category: ${item.category}`);
      if (item.selectedColor) details.push(`Color: ${item.selectedColor.name || item.selectedColor}`);
      const detailsStr = details.length > 0 ? `<br><small style="color:#666;">${details.join(' | ')}</small>` : '';
      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const total = price * quantity;
      const colorDisplay = item.selectedColor ? `
        <br><small style="display:inline-flex;align-items:center;margin-top:4px;">
          <span style="display:inline-block;width:16px;height:16px;background-color:${item.selectedColor.hex || '#ccc'};border:1px solid #ddd;border-radius:3px;margin-right:6px;"></span>
          <strong>Color:</strong> ${item.selectedColor.name || 'Selected Color'}
        </small>` : '';
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;"><strong>${item.name || 'Product'}</strong>${detailsStr}${colorDisplay}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">₹${price.toLocaleString()}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">₹${total.toLocaleString()}</td>
        </tr>`;
    }).join('');

    const adminEmailHTML = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f5f5f5;}
        .container{max-width:600px;margin:0 auto;background:white;}
        .header{background:linear-gradient(135deg,#d946ef,#c026d3);color:white;padding:24px;text-align:center;}
        .content{padding:24px;}
        .alert{background:#fef3c7;border:1px solid #f59e0b;color:#92400e;padding:16px;border-radius:6px;margin:16px 0;}
        .order-details{background:#f9fafb;padding:20px;border-radius:8px;margin:16px 0;border:1px solid #e5e7eb;}
        .table{width:100%;border-collapse:collapse;margin:16px 0;}
        .table th{background:#f3f4f6;padding:12px;text-align:left;border-bottom:2px solid #d1d5db;font-weight:bold;}
        .total-row{background:#ecfdf5;font-weight:bold;}
        .customer-info{background:#eff6ff;padding:16px;border-left:4px solid #3b82f6;margin:16px 0;border-radius:0 6px 6px 0;}
        .footer{background:#374151;color:white;padding:20px;text-align:center;}
      </style></head><body>
      <div class="container">
        <div class="header"><h1>🛒 New Order Alert!</h1><h2>Order #${orderData.id}</h2><p style="margin:0;opacity:.9;">Ashok Kumar Textiles - Admin Notification</p></div>
        <div class="content">
          <div class="alert">
            <strong>⚡ New Order Received:</strong> Payment confirmed.<br>
            <strong>📅 Date:</strong> ${new Date().toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}<br>
            <strong>⏰ Time:</strong> ${new Date().toLocaleTimeString('en-IN')}
          </div>
          <div class="customer-info">
            <h3 style="margin-top:0;color:#1e40af;">👤 Customer Information</h3>
            <p><strong>Email:</strong> ${orderData.user_email}</p>
            <p><strong>Phone:</strong> ${orderData.phone || 'Not provided'}</p>
            <p><strong>Payment ID:</strong> <code>${orderData.payment_id || 'Not available'}</code></p>
          </div>
          <div class="order-details">
            <h3 style="margin-top:0;color:#7c2d12;">📦 Order Details</h3>
            <table class="table">
              <thead><tr><th>Product</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr></thead>
              <tbody>
                ${itemsHTML}
                <tr class="total-row">
                  <td colspan="3" style="padding:16px;text-align:right;font-weight:bold;">Order Total:</td>
                  <td style="padding:16px;text-align:right;font-weight:bold;font-size:18px;color:#d946ef;">₹${Number(orderData.amount).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ${orderData.address ? `
          <div class="customer-info">
            <h3 style="margin-top:0;color:#059669;">🏠 Shipping Address</h3>
            <p>${orderData.address}</p><p>${orderData.city || ''}, ${orderData.state || ''}</p>
            <p><strong>PIN:</strong> ${orderData.pincode || ''}</p><p><strong>Country:</strong> India</p>
          </div>` : ''}
          <div style="text-align:center;margin:24px 0;padding:20px;background:#fef3c7;border-radius:8px;">
            <h3 style="color:#92400e;margin-top:0;">⚡ Action Required</h3>
            <p style="margin-bottom:0;color:#92400e;">Please process this order and prepare for shipping.</p>
          </div>
        </div>
        <div class="footer"><p style="margin:0;"><strong>Ashok Kumar Textiles</strong></p><p style="margin:5px 0 0 0;opacity:.8;">Order Management System</p></div>
      </div></body></html>`;

    const mailOptions = {
      from: { name: 'Ashok Kumar Textiles Order System', address: gmailUser },
      to: adminEmail,
      subject: `🛒 New Order #${orderData.id} - ₹${orderData.amount}`,
      html: adminEmailHTML,
      headers: { 'X-Mailer': 'Ashok Kumar Textiles Order System', 'X-Priority': '2', 'Importance': 'High' }
    };

    console.log(`📧 Sending admin notification to: ${adminEmail}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent:', info.messageId);

    res.status(200).json({ success: true, messageId: info.messageId, message: 'Admin notification email sent successfully' });

  } catch (error) {
    console.error('❌ Admin email error:', error);
    let errorMessage = 'Failed to send admin notification email';
    if (error.code === 'EAUTH') errorMessage = 'Gmail authentication failed.';
    else if (error.code === 'ENOTFOUND') errorMessage = 'Network error.';
    res.status(500).json({ success: false, error: errorMessage, details: error.message });
  }
});

// ─── Customer Order Confirmation Email ────────────────────────────────────────
app.post('/api/send-customer-email', async (req, res) => {
  try {
    const { orderData } = req.body;

    if (!orderData || !orderData.id || !orderData.user_email) {
      return res.status(400).json({ error: 'Missing required order data (id, user_email)' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.user_email)) {
      return res.status(400).json({ error: 'Invalid customer email address format' });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      return res.status(500).json({ error: 'Email service not configured.' });
    }
    if (gmailUser === 'your-email@gmail.com' || gmailPassword === 'your-16-digit-app-password') {
      return res.status(500).json({ error: 'Email service not properly configured.' });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPassword },
      tls: { rejectUnauthorized: false }
    });

    const itemsHTML = orderData.items.map(item => {
      const details = [];
      if (item.fabric) details.push(`Fabric: ${item.fabric}`);
      if (item.category) details.push(`Category: ${item.category}`);
      if (item.selectedColor) details.push(`Color: ${item.selectedColor.name || item.selectedColor}`);
      const detailsStr = details.length > 0 ? `<br><small style="color:#666;">${details.join(' | ')}</small>` : '';
      const quantity = Number(item.quantity) || 1;
      const price = Number(item.price) || 0;
      const total = price * quantity;
      const colorDisplay = item.selectedColor ? `
        <br><small style="display:inline-flex;align-items:center;margin-top:4px;">
          <span style="display:inline-block;width:16px;height:16px;background-color:${item.selectedColor.hex || '#ccc'};border:1px solid #ddd;border-radius:3px;margin-right:6px;"></span>
          <strong>Selected Color:</strong> ${item.selectedColor.name || 'Custom Color'}
        </small>` : '';
      return `
        <tr>
          <td style="padding:12px;border-bottom:1px solid #eee;"><strong>${item.name || 'Product'}</strong>${detailsStr}${colorDisplay}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:center;">${quantity}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;">₹${price.toLocaleString()}</td>
          <td style="padding:12px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">₹${total.toLocaleString()}</td>
        </tr>`;
    }).join('');

    const customerEmailHTML = `
      <!DOCTYPE html><html><head><meta charset="utf-8">
      <style>
        body{font-family:Arial,sans-serif;line-height:1.6;color:#333;margin:0;padding:0;background:#f5f5f5;}
        .container{max-width:600px;margin:0 auto;background:white;}
        .header{background:linear-gradient(135deg,#10b981,#059669);color:white;padding:24px;text-align:center;}
        .content{padding:24px;}
        .success-badge{background:#d1fae5;border:1px solid #10b981;color:#065f46;padding:16px;border-radius:6px;margin:16px 0;text-align:center;}
        .order-details{background:#f9fafb;padding:20px;border-radius:8px;margin:16px 0;border:1px solid #e5e7eb;}
        .table{width:100%;border-collapse:collapse;margin:16px 0;}
        .table th{background:#f3f4f6;padding:12px;text-align:left;border-bottom:2px solid #d1d5db;font-weight:bold;}
        .total-row{background:#ecfdf5;font-weight:bold;}
        .shipping-info{background:#fef3c7;padding:16px;border-left:4px solid #f59e0b;margin:16px 0;border-radius:0 6px 6px 0;}
        .next-steps{background:#eff6ff;padding:16px;border-radius:8px;margin:16px 0;}
        .footer{background:#374151;color:white;padding:20px;text-align:center;}
      </style></head><body>
      <div class="container">
        <div class="header"><h1>✅ Order Confirmed!</h1><h2>Order #${orderData.id}</h2><p style="margin:0;opacity:.9;">Thank you for shopping with Ashok Kumar Textiles</p></div>
        <div class="content">
          <div class="success-badge">
            <h3 style="margin:0 0 8px 0;color:#065f46;">🎉 Payment Successful!</h3>
            <p style="margin:0;">Your order has been confirmed and we're preparing it for shipment.</p>
          </div>
          <div class="order-details">
            <h3 style="margin-top:0;color:#374151;">📦 Order Summary</h3>
            <p><strong>Order Number:</strong> <span style="color:#10b981;font-weight:bold;">${orderData.id}</span></p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN',{year:'numeric',month:'long',day:'numeric'})}</p>
            <p><strong>Payment ID:</strong> <code>${orderData.paymentId}</code></p>
            <table class="table">
              <thead><tr><th>Product</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr></thead>
              <tbody>
                ${itemsHTML}
                ${orderData.shippingAmount && orderData.shippingAmount > 0 ? `
                <tr><td colspan="3" style="padding:12px;text-align:right;">Shipping:</td><td style="padding:12px;text-align:right;">₹${Number(orderData.shippingAmount).toLocaleString()}</td></tr>` : ''}
                <tr class="total-row">
                  <td colspan="3" style="padding:16px;text-align:right;font-weight:bold;">Order Total:</td>
                  <td style="padding:16px;text-align:right;font-weight:bold;font-size:18px;color:#10b981;">₹${Number(orderData.amount).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
          ${orderData.shippingAddress ? `
          <div class="shipping-info">
            <h3 style="margin-top:0;color:#92400e;">🚚 Shipping Information</h3>
            <p>${orderData.shippingAddress.street || ''}</p>
            <p>${orderData.shippingAddress.city || ''}, ${orderData.shippingAddress.state || ''}</p>
            <p><strong>PIN Code:</strong> ${orderData.shippingAddress.pincode || ''}</p>
            <p><strong>Country:</strong> ${orderData.shippingAddress.country || 'India'}</p>
          </div>` : ''}
          <div class="next-steps">
            <h3 style="margin-top:0;color:#1e40af;">📋 What's Next?</h3>
            <ul style="margin:0;padding-left:20px;">
              <li>We'll process your order within 1-2 business days</li>
              <li>You'll receive a shipping confirmation with tracking details</li>
              <li>Your order will be delivered within 5-7 business days</li>
              <li>Contact us if you have any questions about your order</li>
            </ul>
          </div>
          <div style="text-align:center;margin:24px 0;padding:20px;background:#f0fdf4;border-radius:8px;border:1px solid #16a34a;">
            <h3 style="color:#15803d;margin-top:0;">💚 Thank You for Your Order!</h3>
            <p style="margin-bottom:0;color:#15803d;">We appreciate your business and look forward to serving you again.</p>
          </div>
        </div>
        <div class="footer">
          <p style="margin:0;"><strong>Ashok Kumar Textiles</strong></p>
          <p style="margin:5px 0;opacity:.8;">Premium Quality Fabrics & Textiles</p>
          <p style="margin:5px 0 0 0;opacity:.8;font-size:12px;">Need help? Contact us at ${gmailUser}</p>
        </div>
      </div></body></html>`;

    const mailOptions = {
      from: { name: 'Ashok Kumar Textiles', address: gmailUser },
      to: orderData.user_email,
      subject: `✅ Order Confirmed #${orderData.id} - Thank you for your purchase!`,
      html: customerEmailHTML,
      headers: { 'X-Mailer': 'Ashok Kumar Textiles Order System', 'X-Priority': '3', 'Importance': 'Normal' }
    };

    console.log(`📧 Sending order confirmation to: ${orderData.user_email}`);
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Customer confirmation email sent:', info.messageId);

    res.status(200).json({ success: true, messageId: info.messageId, message: 'Customer confirmation email sent successfully' });

  } catch (error) {
    console.error('❌ Customer email error:', error);
    let errorMessage = 'Failed to send customer confirmation email';
    if (error.code === 'EAUTH') errorMessage = 'Gmail authentication failed.';
    else if (error.code === 'ENOTFOUND') errorMessage = 'Network error.';
    res.status(500).json({ success: false, error: errorMessage, details: error.message });
  }
});

// ─── HDFC Config ───────────────────────────────────────────────────────────────
const HDFC_CONFIG = {
  API_KEY: process.env.HDFC_API_KEY || 'D5B755878234D26AC0C865AA253012',
  MERCHANT_ID: process.env.HDFC_MERCHANT_ID || 'SG3514',
  CLIENT_ID: process.env.HDFC_CLIENT_ID || 'hdfcmaster',
  BASE_URL: process.env.HDFC_BASE_URL || 'https://smartgateway.hdfcbank.com',
  PAYMENT_ENDPOINT: process.env.HDFC_PAYMENT_ENDPOINT || '/merchant/ipay',
  RESPONSE_KEY: process.env.HDFC_RESPONSE_KEY || '9EFC035E8F043AFB88F37DEF30C16D',
  ENVIRONMENT: 'production'
};

// ─── HDFC Create Order ─────────────────────────────────────────────────────────
// FIX: Removed unreachable code after the early return. PaymentHandler stub kept as comment.
app.post('/api/hdfc-create-order', async (req, res) => {
  console.log('🏦 HDFC Create order request received:', { body: req.body, timestamp: new Date().toISOString() });

  try {
    const { amount, firstname, email, phone } = req.body;

    if (!amount || !firstname || !email || !phone) {
      return res.status(400).json({ error: 'Missing required fields: amount, firstname, email, phone' });
    }

    // PaymentHandler.js does not exist — return clear error
    return res.status(500).json({
      error: 'Payment gateway module not configured',
      details: 'HDFC payment processing is not available. Please use Razorpay.'
    });

  } catch (error) {
    console.error('❌ HDFC Create Order Error:', error);
    return res.status(500).json({
      error: 'Failed to create HDFC payment order',
      details: error.message,
      type: error.name || 'Unknown Error'
    });
  }
});

// ─── HDFC Test Payment Page ────────────────────────────────────────────────────
app.all('/api/hdfc-test-payment', async (req, res) => {
  console.log('🧪 HDFC Test Payment Page accessed:', { method: req.method, body: req.body, query: req.query });

  const testPaymentPage = `
    <!DOCTYPE html><html>
    <head><title>HDFC Payment Gateway - Test Environment</title>
    <style>
      body{font-family:Arial,sans-serif;max-width:600px;margin:50px auto;padding:20px;background:#f5f5f5;}
      .payment-container{background:white;padding:30px;border-radius:10px;box-shadow:0 2px 10px rgba(0,0,0,.1);}
      .hdfc-logo{text-align:center;color:#004088;font-size:24px;font-weight:bold;margin-bottom:20px;}
      .amount{font-size:32px;color:#004088;text-align:center;margin:20px 0;}
      .details{background:#f8f9fa;padding:15px;border-radius:5px;margin:20px 0;}
      .button{width:100%;padding:15px;margin:10px 0;border:none;border-radius:5px;font-size:16px;cursor:pointer;}
      .success{background:#28a745;color:white;} .failure{background:#dc3545;color:white;}
      .note{background:#fff3cd;border:1px solid #ffeaa7;padding:15px;border-radius:5px;margin:20px 0;color:#856404;}
    </style></head>
    <body>
      <div class="payment-container">
        <div class="hdfc-logo">🏦 HDFC Bank Payment Gateway</div>
        <div class="note"><strong>⚠️ TEMPORARY LOCAL TEST ENVIRONMENT</strong><br>HDFC smartgateway URLs are currently not accessible.</div>
        <div class="amount">₹ ${req.body?.amount || req.query?.amount || '0'}</div>
        <div class="details">
          <strong>Transaction Details:</strong><br>
          Transaction ID: ${req.body?.txnid || req.query?.txnid || 'TEST_' + Date.now()}<br>
          Merchant: ${req.body?.merchant_id || req.query?.merchant_id || 'Test Merchant'}<br>
          Email: ${req.body?.email || req.query?.email || 'test@example.com'}
        </div>
        <button class="button success" onclick="simulateSuccess()">✅ Simulate Successful Payment</button>
        <button class="button failure" onclick="simulateFailure()">❌ Simulate Failed Payment</button>
      </div>
      <script>
        function simulateSuccess() {
          window.location.href = '/payment/success?status=success&txnid=' + (new URLSearchParams(window.location.search).get('txnid') || 'TEST_' + Date.now());
        }
        function simulateFailure() {
          window.location.href = '/payment/failure?status=failed&txnid=' + (new URLSearchParams(window.location.search).get('txnid') || 'TEST_' + Date.now());
        }
      </script>
    </body></html>`;

  return res.status(200).send(testPaymentPage);
});

// ─── HDFC Payment Handlers ─────────────────────────────────────────────────────
app.post('/api/hdfc-payment-success', (req, res) => {
  console.log('✅ HDFC Payment Success:', req.body);
  res.redirect(`http://localhost:5174/payment/success?txnid=${req.body.txnid}`);
});

app.post('/api/hdfc-payment-failure', (req, res) => {
  console.log('❌ HDFC Payment Failure:', req.body);
  res.redirect(`http://localhost:5174/payment/failure?txnid=${req.body.txnid}`);
});

app.post('/api/hdfc-payment-cancel', (req, res) => {
  console.log('🚫 HDFC Payment Cancelled:', req.body);
  res.redirect(`http://localhost:5174/payment/cancel?txnid=${req.body.txnid}`);
});

// ─── HDFC Payment Response ─────────────────────────────────────────────────────
// FIX: Removed reference to undeclared `verifiedStatus` inside catch block.
//      Now uses `status` from the callback in both success and fallback paths.
app.all('/api/hdfc-payment-response', async (req, res) => {
  console.log('🏦 HDFC Payment Response received:', { method: req.method, body: req.body, timestamp: new Date().toISOString() });

  try {
    const orderId = req.body.order_id || req.body.orderId || req.query.order_id;
    const status = req.body.status || req.query.status;
    const amount = req.body.amount || req.query.amount;

    if (!orderId) {
      console.error('❌ Missing order_id in HDFC response');
      return res.redirect('http://localhost:5174/payment/failure?error=missing_order_id');
    }

    const baseUrl = 'http://localhost:5174';

    // PaymentHandler not available — use status from callback directly
    const resolveRedirect = (resolvedStatus) => {
      switch (resolvedStatus) {
        case 'CHARGED':
        case 'SUCCESS':
        case 'COMPLETED':
          return `${baseUrl}/payment/success?status=success&order_id=${orderId}&gateway=HDFC&amount=${amount || ''}`;
        case 'PENDING':
        case 'PENDING_VBV':
          return `${baseUrl}/payment/success?status=pending&order_id=${orderId}&gateway=HDFC&amount=${amount || ''}&message=Payment is being processed`;
        default:
          return `${baseUrl}/payment/failure?status=failed&order_id=${orderId}&gateway=HDFC&error=${resolvedStatus || 'payment_failed'}`;
      }
    };

    console.log(`🔀 Redirecting HDFC response for order ${orderId} with status: ${status}`);
    return res.redirect(resolveRedirect(status));

  } catch (error) {
    console.error('💥 HDFC Payment Response Error:', error);
    return res.redirect(`http://localhost:5174/payment/failure?error=server_error&message=${encodeURIComponent(error.message)}`);
  }
});

// ─── Admin Orders ──────────────────────────────────────────────────────────────
// FIX: Removed the stray `}` and `});` that caused a syntax error at the end of this route.
app.get('/api/admin-orders', async (req, res) => {
  const startTime = Date.now();

  try {
    const adminToken = req.headers['x-admin-token'];
    const HARDCODED_ADMIN_TOKEN = 'admin-secret-key';

    if (!adminToken || adminToken !== HARDCODED_ADMIN_TOKEN) {
      console.warn('⚠️ Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing admin token', code: 'INVALID_TOKEN' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials', code: 'CONFIG_ERROR' });
    }

    const supabase = createClient(supabaseUrl, anonKey);

    const page = Math.max(0, parseInt(req.query.page || '0'));
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20')));
    const offset = page * limit;

    console.log(`📦 Fetching orders - Page: ${page}, Limit: ${limit}, Offset: ${offset}`);

    const { data: ordersData, error: ordersError, count } = await supabase
      .from('orders')
      .select('id, user_id, amount, shipping, status, payment_id, phone, address, city, state, pincode, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (ordersError) {
      console.error('❌ Error fetching orders:', ordersError);
      return res.status(500).json({ error: 'Failed to fetch orders from database', code: 'ORDERS_QUERY_ERROR', details: ordersError.message });
    }

    if (!ordersData || ordersData.length === 0) {
      return res.status(200).json({
        success: true,
        orders: [],
        pagination: { page, limit, total: count || 0, hasMore: false }
      });
    }

    const userIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))];
    let userMap = {};

    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', userIds);

      if (usersError) {
        console.warn('⚠️ Warning fetching user data:', usersError.message);
      } else if (usersData) {
        userMap = usersData.reduce((acc, user) => { acc[user.id] = user; return acc; }, {});
      }
    }

    const enrichedOrders = ordersData.map(order => {
      const userData = userMap[order.user_id] || {};
      return {
        id: order.id,
        user_id: order.user_id,
        amount: order.amount,
        shipping: order.shipping || 0,
        status: order.status || 'pending',
        payment_id: order.payment_id || 'Not available',
        razorpay_order_id: order.payment_id || 'Not available',
        tracking_id: 'Not available',
        created_at: order.created_at,
        updated_at: order.created_at,
        phone: order.phone || 'Not provided',
        address: order.address || 'Not provided',
        city: order.city || 'Not provided',
        state: order.state || 'Not provided',
        pincode: order.pincode || 'Not provided',
        user_details: { email: userData.email || 'Not provided', full_name: userData.full_name || 'Guest User' },
        items: [],
        subtotal: order.amount || 0,
        total: (order.amount || 0) + (order.shipping || 0)
      };
    });

    console.log(`✅ Processed ${enrichedOrders.length} orders in ${Date.now() - startTime}ms`);

    return res.status(200).json({
      success: true,
      orders: enrichedOrders,
      pagination: { page, limit, total: count || 0, hasMore: (page + 1) * limit < (count || 0) },
      timestamp: new Date().toISOString(),
      processingTime: `${Date.now() - startTime}ms`
    });

  } catch (error) {
    console.error('❌ Unexpected error in admin-orders:', error);
    return res.status(500).json({ error: 'Internal server error', code: 'INTERNAL_ERROR', message: error.message, timestamp: new Date().toISOString() });
  }
});

// ─── Update Order Status ──────────────────────────────────────────────────────
app.post('/api/update-order-status', async (req, res) => {
  const VALID_STATUSES = ['processing', 'out_for_delivery', 'delivered'];
  const HARDCODED_ADMIN_TOKEN = 'admin-secret-key';

  try {
    // Verify admin authentication
    const adminToken = req.headers['x-admin-token'];
    if (!adminToken || adminToken !== HARDCODED_ADMIN_TOKEN) {
      return res.status(401).json({ error: 'Unauthorized: Invalid or missing admin token' });
    }

    // Extract order ID and new status
    const { orderId, status } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    // Validate status value
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // Get Supabase client
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Supabase credentials',
      });
    }

    const apiKey = serviceRoleKey || anonKey;
    const supabase = createClient(supabaseUrl, apiKey);

    // Update order status in database
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select('id, status, updated_at, user_id, amount, created_at');

    if (updateError) {
      console.error('❌ Error updating order status:', updateError);
      return res.status(500).json({
        error: 'Failed to update order status',
        details: updateError.message,
      });
    }

    if (!updatedOrder || updatedOrder.length === 0) {
      return res.status(404).json({
        error: 'Order not found',
        orderId,
      });
    }

    console.log(`✅ Order ${orderId} status updated to ${status}`);

    // Fetch full order data including user email and items for email sending
    try {
      const { data: fullOrderData, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          user_id,
          items,
          amount,
          shipping,
          status,
          created_at,
          updated_at,
          payment_id,
          phone,
          address,
          city,
          state,
          pincode
        `)
        .eq('id', orderId)
        .single();

      if (!fetchError && fullOrderData) {
        // Fetch user email separately to handle RLS policies
        let userEmail = null;
        let userName = null;
        
        if (fullOrderData.user_id) {
          try {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('email, full_name')
              .eq('id', fullOrderData.user_id)
              .limit(1)
              .maybeSingle();
            
            if (userError) {
              console.error(`❌ Error fetching user data for user_id ${fullOrderData.user_id}:`, userError);
            } else if (userData) {
              userEmail = userData.email;
              userName = userData.full_name;
            } else {
              console.warn(`⚠️ No user found with user_id ${fullOrderData.user_id}`);
            }
          } catch (err) {
            console.error(`❌ Exception fetching user data: ${err.message}`);
          }
        } else {
          console.warn(`⚠️ Order ${orderId} has no user_id associated`);
        }

        // Only send email if we have the customer email
        if (userEmail) {
          // Send status update emails to customer and admin
          const emailType = `${status === 'out_for_delivery' ? 'out_for_delivery' : status}`;
          const orderData = {
            id: fullOrderData.id,
            user_email: userEmail,
            email: userEmail,
            user_name: userName,
            items: fullOrderData.items || [],
            amount: fullOrderData.amount || 0,
            shipping: fullOrderData.shipping || 0,
            created_at: fullOrderData.created_at,
            updated_at: fullOrderData.updated_at,
            paymentId: fullOrderData.payment_id,
            phone: fullOrderData.phone,
            address: fullOrderData.address,
            city: fullOrderData.city,
            state: fullOrderData.state,
            pincode: fullOrderData.pincode,
          };

          // Send email asynchronously (don't wait for response)
          sendOrderEmails(orderData, emailType).catch(err => 
            console.error(`❌ Failed to send status email: ${err.message}`)
          );
        } else {
          console.error(`❌ Could not retrieve customer email for order ${orderId}. Skipping email send.`);
        }
      } else {
        console.error(`❌ Could not fetch full order data for order ${orderId}:`, fetchError);
      }
    } catch (emailError) {
      console.error(`⚠️ Error fetching order for email: ${emailError.message}`);
    }

    return res.status(200).json({
      message: 'Order status updated successfully',
      order: updatedOrder[0],
    });
  } catch (error) {
    console.error('❌ Update order status API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
});

// ─── Send Order Confirmation Email ─────────────────────────────────────────
app.post('/api/send-order-confirmation', async (req, res) => {
  try {
    const { orderId, customerEmail } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: 'Missing required field: orderId'
      });
    }

    // Fetch order data from Supabase
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      return res.status(500).json({
        error: 'Server configuration error: Missing Supabase credentials'
      });
    }

    const apiKey = serviceKey || anonKey;
    const supabase = createClient(supabaseUrl, apiKey);

    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        user_id,
        items,
        amount,
        shipping,
        status,
        created_at,
        updated_at,
        payment_id,
        phone,
        address,
        city,
        state,
        pincode
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !orderData) {
      return res.status(404).json({
        error: 'Order not found',
        orderId
      });
    }

    // Fetch user email separately to handle RLS policies
    let userEmail = customerEmail;
    let userName = null;
    
    if (!userEmail && orderData.user_id) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', orderData.user_id)
          .limit(1)
          .maybeSingle();
        
        if (!userError && userData) {
          userEmail = userData.email;
          userName = userData.full_name;
        }
      } catch (err) {
        console.warn(`⚠️ Could not fetch user data: ${err.message}`);
      }
    }

    // Send confirmation email with full order data
    const emailData = {
      id: orderData.id,
      user_email: userEmail,
      email: userEmail,
      user_name: userName,
      items: orderData.items || [],
      amount: orderData.amount || 0,
      shipping: orderData.shipping || 0,
      created_at: orderData.created_at,
      updated_at: orderData.updated_at,
      paymentId: orderData.payment_id,
      phone: orderData.phone,
      address: orderData.address,
      city: orderData.city,
      state: orderData.state,
      pincode: orderData.pincode,
    };

    const emailResult = await sendOrderEmails(emailData, 'order_confirmation');

    if (!emailResult.success) {
      return res.status(500).json({
        error: 'Failed to send confirmation email',
        details: emailResult.message
      });
    }

    console.log(`✅ Order confirmation email sent for order ${orderId}`);

    return res.status(200).json({
      success: true,
      message: 'Order confirmation email sent successfully',
      orderId,
      customerEmail: emailData.user_email
    });

  } catch (error) {
    console.error('❌ Send order confirmation email error:', error);
    return res.status(500).json({
      error: 'Failed to send order confirmation email',
      details: error.message
    });
  }
});

// ─── Error Handling Middleware ─────────────────────────────────────────────────
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal server error', message: error.message, timestamp: new Date().toISOString() });
  }
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl, method: req.method, timestamp: new Date().toISOString() });
});

// ─── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Payment Server v2.0.0 running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💳 Payment status: http://localhost:${PORT}/api/razorpay-status`);
    console.log(`🔧 Razorpay mode: ${currentMode}`);
    if (razorpay) console.log('✅ Razorpay integration ready');
    else console.log('⚠️  Razorpay not configured - check environment variables');
  });
}