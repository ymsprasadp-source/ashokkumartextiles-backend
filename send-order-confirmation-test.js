// Test Order Confirmation Email - Fetch last order and send to yash.freelancer17@gmail.com
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Supabase setup - using same env vars as backend API
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env file');
  console.error('💡 Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to backend/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function sendOrderConfirmationTest() {
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
      throw new Error('No orders available to test with');
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

    // Create order confirmation email HTML
    const orderEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation - ${lastOrder.id}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { background: #333; color: white; padding: 15px; text-align: center; margin-top: 20px; border-radius: 8px; }
          .success { background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46; padding: 12px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Order Confirmed!</h1>
            <p>Order #${lastOrder.id}</p>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">Ashok Kumar Textiles</p>
          </div>
          
          <div class="content">
            <div class="success">
              <strong>✓ Thank you for your order!</strong> We've received your payment and are processing your order.
              <br><strong>📅 Order Date:</strong> ${new Date(lastOrder.created_at).toLocaleDateString('en-IN')}
            </div>

            <div class="order-details">
              <h2 style="margin-top: 0; color: #2563eb;">📋 Order Details</h2>
              <p><strong>Order ID:</strong> ${lastOrder.id}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">${lastOrder.status || 'Processing'}</span></p>
              <p><strong>Payment ID:</strong> ${lastOrder.payment_id || 'Pending'}</p>
            </div>

            <div class="order-details">
              <h2 style="margin-top: 0; color: #2563eb;">🛍️ Order Items</h2>
              ${orderItems.length > 0 ? `
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
                      <td style="padding: 16px; text-align: right; font-size: 18px; color: #10b981; border-top: 2px solid #10b981;">₹${Number(lastOrder.amount || 0).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
              ` : `
                <p><strong>Total Amount:</strong> ₹${Number(lastOrder.amount || 0).toLocaleString()}</p>
                <p><strong>Items:</strong> ${orderItems.length} item(s)</p>
              `}
            </div>

            <div class="order-details">
              <h2 style="margin-top: 0; color: #2563eb;">📍 Shipping Address</h2>
              <p style="margin: 0;">
                ${lastOrder.address || 'Address not provided'}<br>
                ${lastOrder.city || ''}, ${lastOrder.state || ''} ${lastOrder.pincode || ''}<br>
                India
              </p>
              ${lastOrder.phone ? `<p style="margin-top: 10px;"><strong>Phone:</strong> ${lastOrder.phone}</p>` : ''}
            </div>

            <div class="order-details">
              <h3 style="margin-top: 0; color: #2563eb;">📦 What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>We're preparing your items for shipment</li>
                <li>You'll receive tracking information once shipped</li>
                <li>Estimated delivery: 5-7 business days</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0; font-weight: bold;">Ashok Kumar Textiles</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">
              TEST EMAIL - This is sent to yash.freelancer17@gmail.com for verification
            </p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">
              Original recipient would be: ${lastOrder.user_email}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: {
        name: 'Ashok Kumar Textiles (Test)',
        address: process.env.GMAIL_USER
      },
      to: 'yash.freelancer17@gmail.com', // Test recipient
      subject: `✅ TEST: Order Confirmation #${lastOrder.id} - ₹${lastOrder.amount} (Original: ${lastOrder.user_email})`,
      html: orderEmailHTML,
      text: `Order Confirmation - Ashok Kumar Textiles\n\nOrder ID: ${lastOrder.id}\nAmount: ₹${lastOrder.amount}\nStatus: ${lastOrder.status || 'Processing'}\nItems: ${orderItems.length}\n\nTEST EMAIL: This would normally be sent to ${lastOrder.user_email}\nSent to yash.freelancer17@gmail.com for testing.`
    };

    console.log('📤 Sending order confirmation test email...');
    console.log('📧 Test recipient: yash.freelancer17@gmail.com');
    console.log('💡 Original order email:', lastOrder.user_email);
    
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Order confirmation test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('🎉 Check yash.freelancer17@gmail.com inbox');
    console.log('\n📋 Order Summary:');
    console.log('   Order ID:', lastOrder.id);
    console.log('   Customer:', lastOrder.user_email);
    console.log('   Amount: ₹', lastOrder.amount);
    console.log('   Items:', orderItems.length);
    console.log('   Status:', lastOrder.status || 'Processing');
    
    return {
      success: true,
      messageId: info.messageId,
      orderData: lastOrder
    };

  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('🔐 Authentication failed. Check Gmail credentials in .env file');
    } else if (error.code === 'ENOTFOUND') {
      console.error('🌐 Network error. Check internet connection.');
    }
    
    throw error;
  }
}

// Run the test
sendOrderConfirmationTest()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    console.log('💬 If the email looks good, confirm to send to aktexmsp9@gmail.com');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
