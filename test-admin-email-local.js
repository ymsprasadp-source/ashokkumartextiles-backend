// Test Admin Email Locally
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testAdminEmail() {
  console.log('🔧 Testing Admin Email...');
  console.log('📧 Gmail User:', process.env.GMAIL_USER);
  console.log('🎯 Sending to:', 'yash.freelancer17@gmail.com');
  
  try {
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

    // Test email HTML
    const testEmailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Test Email - Ashok Kumar Textiles</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #2563eb, #3b82f6); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { background: #333; color: white; padding: 15px; text-align: center; margin-top: 20px; border-radius: 8px; }
          .success { background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46; padding: 12px; border-radius: 4px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Test Email</h1>
            <p>Ashok Kumar Textiles - Email System Test</p>
          </div>
          
          <div class="content">
            <div class="success">
              <strong>✓ Success:</strong> Gmail SMTP is configured correctly!
              <br><strong>📅 Test Date:</strong> ${new Date().toLocaleString('en-IN')}
            </div>

            <div class="info-box">
              <h2 style="margin-top: 0; color: #2563eb;">📧 Email Configuration</h2>
              <p><strong>Sender:</strong> ${process.env.GMAIL_USER}</p>
              <p><strong>Recipient:</strong> yash.freelancer17@gmail.com</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">Active ✓</span></p>
            </div>

            <div class="info-box">
              <h2 style="margin-top: 0; color: #2563eb;">🎯 Test Details</h2>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Gmail SMTP connection: <strong style="color: #10b981;">Working</strong></li>
                <li>Email delivery: <strong style="color: #10b981;">Successful</strong></li>
                <li>Authentication: <strong style="color: #10b981;">Verified</strong></li>
                <li>Template rendering: <strong style="color: #10b981;">Correct</strong></li>
              </ul>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #2563eb;">✨ Next Steps</h3>
              <p>Your email system is ready! You can now:</p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Send order confirmations to customers</li>
                <li>Receive admin notifications for new orders</li>
                <li>Process payment verifications</li>
              </ul>
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0; font-weight: bold;">Ashok Kumar Textiles</p>
            <p style="margin: 5px 0 0 0; font-size: 12px;">This is a test email sent from localhost</p>
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
      to: 'yash.freelancer17@gmail.com',
      subject: '✅ Test Email - Gmail SMTP Working - Ashok Kumar Textiles',
      html: testEmailHTML,
      text: `Test Email - Ashok Kumar Textiles\n\nThis is a test email to verify Gmail SMTP configuration.\nSent from: ${process.env.GMAIL_USER}\nSent to: yash.freelancer17@gmail.com\nDate: ${new Date().toLocaleString('en-IN')}\n\nStatus: Email system is working correctly!`
    };

    console.log('📤 Sending test email...');
    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Test email sent successfully!');
    console.log('📬 Message ID:', info.messageId);
    console.log('🎉 Check yash.freelancer17@gmail.com inbox');
    
    return {
      success: true,
      messageId: info.messageId
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
testAdminEmail()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
