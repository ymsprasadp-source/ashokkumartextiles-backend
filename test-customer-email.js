// Test Customer Order Confirmation Email - Send to yash.freelancer17@gmail.com
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Supabase setup
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendCustomerConfirmationTest() {
  console.log('🔍 Fetching last placed order...');
  
  try {
    // Fetch the most recent order from database
    const { data: orders, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (orderError) {
      console.error('❌ Error fetching orders:', orderError);
      throw new Error('Could not fetch orders from database');
    }

    if (!orders || orders.length === 0) {
      console.error('❌ No orders found in database');
      throw new Error('No orders available');
    }

    const lastOrder = orders[0];
    console.log('✅ Found order:', {
      id: lastOrder.id,
      email: lastOrder.user_email,
      amount: lastOrder.amount,
      created_at: lastOrder.created_at
    });

    // Parse order items
    let orderItems = [];
    try {
      orderItems = typeof lastOrder.items === 'string' 
        ? JSON.parse(lastOrder.items) 
        : (Array.isArray(lastOrder.items) ? lastOrder.items : []);
    } catch (e) {
      console.error('Error parsing items:', e);
      orderItems = [];
    }

    console.log('📦 Order has', orderItems.length, 'items');

    // Gmail SMTP configuration
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

    // Generate items HTML for email
    const itemsHTML = orderItems.map(item => {
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
      const price = Number(item.price || item.discount_price || item.original_price) || 0;
      const total = price * quantity;
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${item.name || item.title || 'Product'}</strong>
            ${detailsStr}
            ${colorDisplay}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">₹${price.toLocaleString()}</td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">₹${total.toLocaleString()}</td>
        </tr>
      `;
    }).join('');

    // Create customer order confirmation email HTML
    const customerEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order Confirmation - Ashok Kumar Textiles</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: white; }
          .header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0 0 10px 0; font-size: 28px; }
          .content { padding: 30px 20px; }
          .success-badge { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .order-box { background: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
          .order-box h2 { margin: 0 0 15px 0; color: #1f2937; font-size: 18px; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { color: #6b7280; font-weight: 500; }
          .detail-value { color: #1f2937; font-weight: 600; }
          .items-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          .items-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db; }
          .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
          .total-row { background: #ecfdf5; font-weight: bold; }
          .total-row td { color: #10b981; font-size: 18px; border-top: 2px solid #10b981; }
          .info-section { background: #eff6ff; padding: 15px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #3b82f6; }
          .footer { background: #1f2937; color: white; padding: 20px; text-align: center; }
          .footer p { margin: 5px 0; }
          .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; font-weight: 600; }
          .test-notice { background: #fef3c7; border: 2px solid #f59e0b; color: #92400e; padding: 12px; margin: 15px 0; border-radius: 6px; text-align: center; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Order Confirmed!</h1>
            <p style="margin: 0; font-size: 16px; opacity: 0.95;">Thank you for shopping with us</p>
          </div>
          
          <div class="content">
            <div class="test-notice">
              ⚠️ TEST EMAIL - Sent to yash.freelancer17@gmail.com for verification
              <br>Original recipient: ${lastOrder.user_email}
            </div>

            <div class="success-badge">
              <strong style="color: #065f46; font-size: 16px;">✓ Your order has been confirmed!</strong>
              <p style="margin: 8px 0 0 0; color: #047857;">We've received your payment and are preparing your items for shipment.</p>
            </div>

            <div class="order-box">
              <h2>📋 Order Information</h2>
              <div class="detail-row">
                <span class="detail-label">Order Number</span>
                <span class="detail-value">#${lastOrder.id}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Order Date</span>
                <span class="detail-value">${new Date(lastOrder.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Order Status</span>
                <span class="detail-value" style="color: #10b981;">✓ ${lastOrder.status || 'Confirmed'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment ID</span>
                <span class="detail-value">${lastOrder.payment_id || 'Processing'}</span>
              </div>
            </div>

            <div class="order-box">
              <h2>🛍️ Order Details</h2>
              ${orderItems.length > 0 ? `
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style="text-align: center; width: 60px;">Qty</th>
                      <th style="text-align: right; width: 100px;">Price</th>
                      <th style="text-align: right; width: 100px;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHTML}
                    <tr class="total-row">
                      <td colspan="3" style="text-align: right; padding: 16px;">Total Amount:</td>
                      <td style="text-align: right; padding: 16px;">₹${Number(lastOrder.amount || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              ` : `
                <p><strong>Total Amount:</strong> ₹${Number(lastOrder.amount || 0).toLocaleString()}</p>
                <p><strong>Items:</strong> ${orderItems.length} item(s)</p>
              `}
            </div>

            <div class="order-box">
              <h2>📍 Delivery Address</h2>
              <p style="margin: 0; line-height: 1.8; color: #374151;">
                <strong>${lastOrder.user_email || 'Customer'}</strong><br>
                ${lastOrder.address || 'Address not provided'}<br>
                ${lastOrder.city || ''}, ${lastOrder.state || ''} ${lastOrder.pincode || ''}<br>
                India
                ${lastOrder.phone ? `<br><strong>Phone:</strong> ${lastOrder.phone}` : ''}
              </p>
            </div>

            <div class="info-section">
              <h3 style="margin: 0 0 10px 0; color: #1e40af;">📦 What happens next?</h3>
              <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                <li>We're carefully preparing your order for shipment</li>
                <li>You'll receive a tracking number via email once shipped</li>
                <li>Expected delivery: 5-7 business days</li>
                <li>Track your order status anytime from your account</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <a href="https://www.ashokkumartextiles.com/orders" class="btn">Track Your Order</a>
            </div>

            <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>Need Help?</strong><br>
                Contact us at <a href="mailto:aktexmsp9@gmail.com" style="color: #667eea;">aktexmsp9@gmail.com</a> or call us
              </p>
            </div>
          </div>

          <div class="footer">
            <p style="font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">Ashok Kumar Textiles</p>
            <p style="font-size: 14px; opacity: 0.9;">Thank you for choosing us!</p>
            <p style="font-size: 12px; opacity: 0.8; margin: 15px 0 0 0;">
              This is an automated email. Please do not reply to this message.
            </p>
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
      to: 'yash.freelancer17@gmail.com', // Test recipient
      subject: `🎉 Order Confirmed #${lastOrder.id} - Ashok Kumar Textiles (₹${lastOrder.amount})`,
      html: customerEmailHTML,
      text: `Order Confirmation - Ashok Kumar Textiles\n\nDear Customer,\n\nThank you for your order!\n\nOrder Number: #${lastOrder.id}\nOrder Date: ${new Date(lastOrder.created_at).toLocaleDateString('en-IN')}\nTotal Amount: ₹${lastOrder.amount}\nStatus: ${lastOrder.status || 'Confirmed'}\n\nItems Ordered: ${orderItems.length} item(s)\n\nDelivery Address:\n${lastOrder.address || 'Address not provided'}\n${lastOrder.city || ''}, ${lastOrder.state || ''} ${lastOrder.pincode || ''}\nIndia\n\nYour order is being prepared for shipment. You will receive tracking information once it ships.\n\nThank you for shopping with Ashok Kumar Textiles!\n\n---\nTEST EMAIL: This would normally be sent to ${lastOrder.user_email}`
    };

    console.log('📤 Sending customer confirmation test email...');
    console.log('📧 Test recipient: yash.freelancer17@gmail.com');
    console.log('💡 Original customer email:', lastOrder.user_email);
    
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Customer confirmation test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('🎉 Check yash.freelancer17@gmail.com inbox');
    console.log('\n📋 Order Summary:');
    console.log('   Order ID:', lastOrder.id);
    console.log('   Customer:', lastOrder.user_email);
    console.log('   Amount: ₹', lastOrder.amount);
    console.log('   Items:', orderItems.length);
    console.log('   Status:', lastOrder.status || 'Confirmed');
    
    return {
      success: true,
      messageId: info.messageId,
      orderData: lastOrder
    };

  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed. Check Gmail credentials');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Network error. Check internet connection');
    }
    
    throw error;
  }
}

// Run the test
sendCustomerConfirmationTest()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    console.log('💬 Check the email and confirm if you want to send to actual customer');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
