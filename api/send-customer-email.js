// Send customer confirmation email API endpoint
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderData } = req.body;

    // Validate orderData
    if (!orderData || !orderData.orderNumber || !orderData.customerEmail) {
      return res.status(400).json({ 
        error: 'Missing required order data' 
      });
    }

    // Validate customer email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(orderData.customerEmail)) {
      return res.status(400).json({ 
        error: 'Invalid customer email address format' 
      });
    }

    // Check Gmail configuration
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailPassword) {
      console.error('❌ Gmail credentials not configured');
      return res.status(500).json({ 
        error: 'Email service not configured. Please contact administrator.' 
      });
    }

    if (gmailUser === 'your-email@gmail.com' || gmailPassword === 'your-16-digit-app-password') {
      console.error('❌ Gmail credentials are still placeholder values');
      return res.status(500).json({ 
        error: 'Email service not properly configured. Please contact administrator.' 
      });
    }

    // Gmail SMTP configuration
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Generate customer confirmation email HTML
    const customerEmailHTML = generateCustomerEmailHTML(orderData);

    // Email configuration for customer
    const mailOptions = {
      from: {
        name: 'Ashok Kumar Textiles',
        address: gmailUser
      },
      to: orderData.user_email || orderData.customerEmail,
      subject: `✅ Order Confirmed #${orderData.id || orderData.orderNumber} - Thank you for your purchase!`,
      html: customerEmailHTML,
      headers: {
        'X-Mailer': 'Ashok Kumar Textiles Order System',
        'X-Priority': '3',
        'Importance': 'Normal'
      }
    };

    // Send email
    console.log(`📧 Sending order confirmation to: ${orderData.user_email || orderData.customerEmail}`);
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Customer confirmation email sent successfully:', info.messageId);

    res.status(200).json({
      success: true,
      messageId: info.messageId,
      message: 'Customer confirmation email sent successfully via Gmail'
    });

  } catch (error) {
    console.error('❌ Customer email sending error:', error);
    
    let errorMessage = 'Failed to send customer confirmation email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Please check email credentials.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network error. Please check internet connection.';
    }

    res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
}

function generateCustomerEmailHTML(orderData) {
  const itemsHTML = orderData.items.map(item => {
    const details = [];
    if (item.fabric) details.push(`Fabric: ${item.fabric}`);
    if (item.category) details.push(`Category: ${item.category}`);
    
    // Add color information if available
    let colorDisplay = '';
    if (item.selectedColor) {
      const colorName = item.selectedColor.name || 'Selected Color';
      const colorHex = item.selectedColor.hex || item.selectedColor.color || '#000000';
      colorDisplay = `<br><div style="display: inline-flex; align-items: center; margin-top: 4px;">
        <span style="display: inline-block; width: 16px; height: 16px; background-color: ${colorHex}; border: 1px solid #ccc; border-radius: 50%; margin-right: 6px;"></span>
        <small style="color: #666;">Color: ${colorName}</small>
      </div>`;
    }
    
    const detailsStr = details.length > 0 ? `<br><small style="color: #666;">${details.join(' | ')}</small>` : '';
    
    const quantity = Number(item.quantity) || 1;
    const price = Number(item.price) || 0;
    const total = price * quantity;
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <strong>${item.name || 'Product'}</strong>
          ${detailsStr}
          ${colorDisplay}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${price.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${total.toLocaleString()}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Confirmation - ${orderData.id || orderData.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 24px; text-align: center; }
        .content { padding: 24px; }
        .success-badge { background: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 16px; border-radius: 6px; margin: 16px 0; text-align: center; }
        .order-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 16px 0; border: 1px solid #e5e7eb; }
        .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
        .table th { background: #f3f4f6; padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db; font-weight: bold; }
        .total-row { background: #ecfdf5; font-weight: bold; }
        .shipping-info { background: #fef3c7; padding: 16px; border-left: 4px solid #f59e0b; margin: 16px 0; border-radius: 0 6px 6px 0; }
        .footer { background: #374151; color: white; padding: 20px; text-align: center; }
        .highlight { color: #10b981; font-weight: bold; }
        .next-steps { background: #eff6ff; padding: 16px; border-radius: 8px; margin: 16px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Order Confirmed!</h1>
          <h2 style="margin: 8px 0;">Order #${orderData.id || orderData.orderNumber}</h2>
          <p style="margin: 0; opacity: 0.9;">Thank you for shopping with Ashok Kumar Textiles</p>
        </div>
        
        <div class="content">
          <div class="success-badge">
            <h3 style="margin: 0 0 8px 0; color: #065f46;">🎉 Payment Successful!</h3>
            <p style="margin: 0;">Your order has been confirmed and we're preparing it for shipment.</p>
          </div>

          <div class="order-details">
            <h3 style="margin-top: 0; color: #374151;">📦 Order Summary</h3>
            <p><strong>Order Number:</strong> <span class="highlight">${orderData.id || orderData.orderNumber}</span></p>
            <p><strong>Order Date:</strong> ${new Date().toLocaleDateString('en-IN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
            <p><strong>Payment ID:</strong> <code>${orderData.payment_id || orderData.paymentId}</code></p>
            
            <table class="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th style="text-align: center;">Qty</th>
                  <th style="text-align: right;">Price</th>
                  <th style="text-align: right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
                ${orderData.shippingAmount && orderData.shippingAmount > 0 ? `
                <tr>
                  <td colspan="3" style="padding: 12px; text-align: right;">Shipping:</td>
                  <td style="padding: 12px; text-align: right;">₹${Number(orderData.shippingAmount).toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr class="total-row">
                  <td colspan="3" style="padding: 16px; text-align: right; font-weight: bold;">Order Total:</td>
                  <td style="padding: 16px; text-align: right; font-weight: bold; font-size: 18px; color: #10b981;">₹${Number(orderData.amount || orderData.totalAmount).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          ${orderData.address ? `
          <div class="shipping-info">
            <h3 style="margin-top: 0; color: #92400e;">🚚 Shipping Information</h3>
            <p><strong>Delivery Address:</strong></p>
            <p>${orderData.address || ''}</p>
            <p>${orderData.city || ''}, ${orderData.state || ''}</p>
            <p><strong>PIN Code:</strong> ${orderData.pincode || ''}</p>
            <p><strong>Country:</strong> India</p>
          </div>
          ` : ''}

          <div class="next-steps">
            <h3 style="margin-top: 0; color: #1e40af;">📋 What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px;">
              <li>We'll process your order within 1-2 business days</li>
              <li>You'll receive a shipping confirmation with tracking details</li>
              <li>Your order will be delivered within 5-7 business days</li>
              <li>Contact us if you have any questions about your order</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 24px 0; padding: 20px; background: #f0fdf4; border-radius: 8px; border: 1px solid #16a34a;">
            <h3 style="color: #15803d; margin-top: 0;">💚 Thank You for Your Order!</h3>
            <p style="margin-bottom: 0; color: #15803d;">We appreciate your business and look forward to serving you again.</p>
          </div>
        </div>

        <div class="footer">
          <p style="margin: 0;"><strong>Ashok Kumar Textiles</strong></p>
          <p style="margin: 5px 0; opacity: 0.8;">Premium Quality Fabrics & Textiles</p>
          <p style="margin: 5px 0 0 0; opacity: 0.8; font-size: 12px;">
            Need help? Contact us at ${process.env.GMAIL_USER || 'support@ashokkumartextiles.com'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}