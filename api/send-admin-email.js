// Direct Admin Email API - Similar to test email but for admin notifications
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
    
    // Use admin email from environment or default to aktexmsp9@gmail.com
    const adminEmail = process.env.ADMIN_EMAIL || 'aktexmsp9@gmail.com';

    // Check Gmail credentials
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return res.status(500).json({
        success: false,
        error: 'Gmail credentials not configured'
      });
    }

    // Gmail SMTP configuration - Same as test email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      },
      secure: true,
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 25000,
      greetingTimeout: 25000,
      socketTimeout: 25000
    });

    // Generate admin email HTML with detailed order information
    const itemsHTML = orderData.items ? orderData.items.map(item => {
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
    }).join('') : '';

    const adminEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>New Order - ${orderData?.orderNumber || 'AKT-XXX'}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { background: #333; color: white; padding: 15px; text-align: center; margin-top: 20px; border-radius: 8px; }
          .alert { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 12px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛒 New Order Received!</h1>
            <p>Order #${orderData?.id || orderData?.orderNumber || 'AKT-XXX'}</p>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Ashok Kumar Textiles Admin Notification</p>
          </div>
          
          <div class="content">
            <div class="alert">
              <strong>⚡ Action Required:</strong> A new order has been placed and requires your attention.
              <br><strong>📅 Order Date:</strong> ${new Date().toLocaleDateString('en-IN')}
            </div>

            <div class="order-details">
              <h2 style="margin-top: 0; color: #2563eb;">👤 Customer Information</h2>
              <p><strong>Name:</strong> ${orderData?.customerName || orderData?.user_name || 'Customer'}</p>
              <p><strong>Email:</strong> <a href="mailto:${orderData?.user_email || orderData?.customerEmail || ''}">${orderData?.user_email || orderData?.customerEmail || 'No email'}</a></p>
              <p><strong>Phone:</strong> <a href="tel:${orderData?.phone || orderData?.customerPhone || ''}">${orderData?.phone || orderData?.customerPhone || 'No phone'}</a></p>
              <p><strong>Payment ID:</strong> ${orderData?.payment_id || orderData?.paymentId || 'N/A'}</p>
            </div>

            <div class="order-details">
              <h2 style="margin-top: 0; color: #2563eb;">🛍️ Order Items</h2>
              ${orderData.items && orderData.items.length > 0 ? `
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <thead>
                    <tr style="background: #f3f4f6;">
                      <th style="padding: 12px; text-align: left; border-bottom: 2px solid #d1d5db; font-weight: bold;">Item</th>
                      <th style="padding: 12px; text-align: center; border-bottom: 2px solid #d1d5db; font-weight: bold;">Qty</th>
                      <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db; font-weight: bold;">Price</th>
                      <th style="padding: 12px; text-align: right; border-bottom: 2px solid #d1d5db; font-weight: bold;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                    <tr style="background: #ecfdf5; font-weight: bold;">
                      <td colspan="3" style="padding: 16px; text-align: right; border-top: 2px solid #10b981;">Total Amount:</td>
                      <td style="padding: 16px; text-align: right; font-size: 18px; color: #10b981; border-top: 2px solid #10b981;">₹${Number(orderData.amount || orderData.totalAmount || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              ` : `
                <p><strong>Total Amount:</strong> ₹${Number(orderData.amount || orderData.totalAmount || 0).toLocaleString()}</p>
                <p><strong>Items:</strong> ${orderData.items?.length || 0} item(s)</p>
              `}
            </div>

            <div class="order-details">
              <h2 style="margin-top: 0; color: #2563eb;">📍 Shipping Address</h2>
              <p style="margin: 0;">
                ${orderData?.address || orderData?.shippingAddress?.street || 'Address not provided'}<br>
                ${orderData?.city || orderData?.shippingAddress?.city || ''}, ${orderData?.state || orderData?.shippingAddress?.state || ''} ${orderData?.pincode || orderData?.shippingAddress?.pincode || ''}<br>
                ${orderData?.country || orderData?.shippingAddress?.country || 'India'}
              </p>
            </div>

            <div class="order-details">
              <h3 style="margin-top: 0; color: #2563eb;">📋 Next Steps</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Review and confirm the order details</li>
                <li>Verify payment status in Razorpay dashboard</li>
                <li>Prepare items for packaging</li>
                <li>Generate shipping label and tracking number</li>
                <li>Update customer with shipping confirmation</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0; font-weight: bold;">Ashok Kumar Textiles Admin Panel</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">This email was sent via Gmail SMTP. Please log in to the admin panel to manage this order.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'Ashok Kumar Textiles',
        address: process.env.GMAIL_USER
      },
      to: adminEmail,
      subject: `🛒 New Order #${orderData?.id || orderData?.orderNumber || 'AKT-XXX'} - ${orderData?.user_name || orderData?.customerName || 'Customer'} (₹${orderData?.amount || orderData?.totalAmount || '0'})`,
      html: adminEmailHTML,
      text: `New Order - ${orderData?.orderNumber || 'AKT-XXX'}\n\nCustomer: ${orderData?.customerName || 'Customer'}\nEmail: ${orderData?.customerEmail || 'No email'}\nPhone: ${orderData?.customerPhone || 'No phone'}\nTotal: ₹${orderData?.totalAmount || '0'}\nPayment ID: ${orderData?.paymentId || 'N/A'}\n\nThis is an admin notification from Ashok Kumar Textiles.`
    };

    console.log('📧 Sending admin email to:', adminEmail);
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Admin email sent successfully:', info.messageId);

    return res.status(200).json({
      success: true,
      message: `Admin email sent successfully to ${adminEmail}`,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Admin email failed:', error);
    
    let errorMessage = 'Failed to send admin email';
    if (error.code === 'EAUTH') {
      errorMessage = 'Gmail authentication failed. Check credentials.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage = 'Network error. Check internet connection.';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: error.message
    });
  }
}