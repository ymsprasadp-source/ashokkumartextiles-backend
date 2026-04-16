// Secure Razorpay payment verification endpoint for Vercel
import crypto from 'crypto';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔐 Payment verification request received:', {
    timestamp: new Date().toISOString()
  });

  try {
    // Check environment variables
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    if (!keySecret) {
      console.error('❌ Razorpay secret key not found in environment variables');
      return res.status(500).json({ 
        valid: false,
        error: 'Payment verification service not configured',
        code: 'MISSING_SECRET'
      });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    
    console.log('🔍 Verification request details:', {
      hasOrderId: !!razorpay_order_id,
      hasPaymentId: !!razorpay_payment_id,
      hasSignature: !!razorpay_signature
    });

    // Validate required fields
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

    // Basic format validation for Razorpay IDs
    if (!razorpay_order_id.startsWith('order_')) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid order ID format' 
      });
    }
    
    if (!razorpay_payment_id.startsWith('pay_')) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid payment ID format' 
      });
    }
    
    if (!/^[a-f0-9]{64}$/i.test(razorpay_signature)) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Invalid signature format' 
      });
    }

    // Create expected signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(text)
      .digest('hex');
    
    // Verify signature using timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpay_signature, 'hex')
    );
    
    console.log('🔐 Payment verification result:', {
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      isValid: isValid,
      timestamp: new Date().toISOString()
    });
    
    if (isValid) {
      return res.status(200).json({ 
        valid: true, 
        message: 'Payment verified successfully',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        verified_at: new Date().toISOString()
      });
    } else {
      // Log security incident
      console.error('SECURITY ALERT: Invalid payment signature detected', {
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        timestamp: new Date().toISOString()
      });

      return res.status(400).json({ 
        valid: false, 
        error: 'Payment signature verification failed',
        code: 'INVALID_SIGNATURE'
      });
    }

  } catch (error) {
    console.error('❌ Payment verification error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });

    return res.status(500).json({ 
      valid: false, 
      error: 'Payment verification service error',
      code: 'VERIFICATION_ERROR'
    });
  }
}
