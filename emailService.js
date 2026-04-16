import nodemailer from 'nodemailer';
import { emailTemplates } from './emailTemplates.js';

const gmailUser = process.env.GMAIL_USER;
const gmailPassword = process.env.GMAIL_APP_PASSWORD;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { 
    user: gmailUser, 
    pass: gmailPassword 
  },
  tls: { 
    rejectUnauthorized: false 
  }
});

export async function sendOrderEmails(orderData, emailType) {
  try {
    // Determine email template
    let emailTemplate;
    let subject;

    switch (emailType) {
      case 'order_confirmation':
        emailTemplate = emailTemplates.orderConfirmation(orderData);
        subject = `✅ Order Confirmed #${orderData.id} - Thank you for your purchase!`;
        break;
      case 'processing':
        emailTemplate = emailTemplates.processingEmail(orderData);
        subject = `⚙️ Your Order #${orderData.id} is Being Processed`;
        break;
      case 'out_for_delivery':
        emailTemplate = emailTemplates.outForDeliveryEmail(orderData);
        subject = `🚚 Your Order #${orderData.id} is Out for Delivery!`;
        break;
      case 'delivered':
        emailTemplate = emailTemplates.deliveredEmail(orderData);
        subject = `✅ Your Order #${orderData.id} Has Been Delivered!`;
        break;
      default:
        throw new Error('Invalid email type');
    }

    // Get customer email from order data
    const customerEmail = orderData.user_email || orderData.email;
    if (!customerEmail) {
      throw new Error('Customer email not found in order data');
    }

    // Admin email (from environment)
    const adminEmail = process.env.ADMIN_EMAIL || gmailUser;

    // Email to customer
    const customerMailOptions = {
      from: { 
        name: 'Ashok Kumar Textiles', 
        address: gmailUser 
      },
      to: customerEmail,
      subject: subject,
      html: emailTemplate,
      headers: { 
        'X-Mailer': 'Ashok Kumar Textiles Order System', 
        'X-Priority': '3', 
        'Importance': 'Normal' 
      }
    };

    // Email to admin (CC to get notification)
    const adminMailOptions = {
      from: { 
        name: 'Ashok Kumar Textiles', 
        address: gmailUser 
      },
      to: adminEmail,
      subject: `[ADMIN] ${subject}`,
      html: `
        <p style="color: #c9a96e; font-weight: bold;">⚠️ ADMIN NOTIFICATION</⚠️></p>
        <p>Customer: ${orderData.user_email || orderData.email}</p>
        <p>Status Update: ${emailType.replace(/_/g, ' ').toUpperCase()}</p>
        <hr>
        ${emailTemplate}
      `,
      headers: { 
        'X-Mailer': 'Ashok Kumar Textiles Order System', 
        'X-Priority': '2', 
        'Importance': 'High' 
      }
    };

    // Send emails in parallel
    const [customerResult, adminResult] = await Promise.all([
      transporter.sendMail(customerMailOptions),
      transporter.sendMail(adminMailOptions)
    ]);

    console.log(`✅ Order emails sent for ${emailType}:`);
    console.log(`   Customer: ${customerEmail} (${customerResult.messageId})`);
    console.log(`   Admin: ${adminEmail} (${adminResult.messageId})`);

    return {
      success: true,
      customerEmail: customerResult.messageId,
      adminEmail: adminResult.messageId,
      message: `Emails sent to customer and admin`
    };

  } catch (error) {
    console.error(`❌ Error sending order emails (${emailType}):`, error);
    return {
      success: false,
      error: error.message,
      message: `Failed to send emails for ${emailType}`
    };
  }
}

// Verify transporter connection
export async function verifyEmailService() {
  try {
    await transporter.verify();
    console.log('✅ Email service ready');
    return true;
  } catch (error) {
    console.error('❌ Email service error:', error);
    return false;
  }
}
