// Backend API for sending emails using Gmail + Nodemailer
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, text } = req.body;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      return res.status(400).json({ 
        error: 'Missing required fields: to, subject, and html or text' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return res.status(400).json({ 
        error: 'Invalid email address format' 
      });
    }

    // Check Gmail credentials
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('❌ Gmail credentials missing');
      return res.status(500).json({
        success: false,
        error: 'Gmail credentials not configured'
      });
    }

    // Gmail SMTP configuration - Vercel optimized
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      secure: true, // Use SSL
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 25000, // 25 seconds
      greetingTimeout: 25000,
      socketTimeout: 25000
    });

    // Email configuration
    const mailOptions = {
      from: {
        name: 'Ashok Kumar Textiles',
        address: process.env.GMAIL_USER
      },
      to,
      subject,
      html,
      text: text || 'Please enable HTML to view this email properly.',
      headers: {
        'X-Mailer': 'Ashok Kumar Textiles Order System',
        'X-Priority': '3',
        'Importance': 'Normal'
      }
    };

    // Send email
    console.log('📧 Attempting to send email to:', to);
    const info = await transporter.sendMail(mailOptions);
    
    console.log('✅ Email sent successfully:', info.messageId);

    // Return success response
    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Email sent successfully via Gmail'
    });

  } catch (error) {
    console.error('❌ Email sending error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send email';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Check email and app password.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network error. Check internet connection.';
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = 'Email sending timed out. Please try again.';
    } else if (error.responseCode === 535) {
      errorMessage = 'Gmail authentication error. Verify app password.';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
}