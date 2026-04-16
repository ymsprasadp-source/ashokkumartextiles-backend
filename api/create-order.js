// Secure Razorpay order creation endpoint for Vercel
import Razorpay from 'razorpay';

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

  console.log('📦 Create order request received:', {
    method: req.method,
    body: req.body,
    timestamp: new Date().toISOString()
  });

  const { amount, currency, receipt, notes } = req.body;

  if (!amount || !currency) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check environment variables
    const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    
    console.log('🔑 Environment check:', {
      hasKeyId: !!keyId,
      hasKeySecret: !!keySecret,
      keyIdPrefix: keyId ? keyId.substring(0, 8) + '...' : 'none'
    });

    if (!keyId || !keySecret) {
      return res.status(500).json({ 
        error: 'Razorpay credentials not configured' 
      });
    }

    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const options = {
      amount: Math.round(amount), // amount in paise
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      payment_capture: 1,
      notes: notes || {},
    };

    const order = await razorpay.orders.create(options);
    
    console.log('✅ Razorpay order created successfully:', {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status
    });
    
    // Return the same structure as the Express server
    return res.status(200).json({
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      receipt: order.receipt,
      status: order.status,
      created_at: order.created_at
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    return res.status(500).json({ 
      error: error.message || 'Razorpay order creation failed',
      code: error.code,
      description: error.description 
    });
  }
}