import 'dotenv/config';
import nodemailer from 'nodemailer';

console.log('Gmail User:', process.env.GMAIL_USER);
console.log('Gmail Password length:', process.env.GMAIL_APP_PASSWORD?.length);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  }
});

console.log('Testing Gmail connection...');

transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail verification failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
  } else {
    console.log('✅ Gmail verification successful!', success);
    
    // Send test email
    const mailOptions = {
      from: {
        name: 'Ashok Kumar Textiles',
        address: process.env.GMAIL_USER
      },
      to: process.env.GMAIL_USER, // Send to self for testing
      subject: '🧪 Gmail Test - Success!',
      text: 'Gmail authentication is working correctly!',
      html: '<h1>✅ Gmail Test Successful!</h1><p>The Gmail configuration is working properly.</p>'
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('❌ Failed to send test email:', error);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
      }
      process.exit(0);
    });
  }
});