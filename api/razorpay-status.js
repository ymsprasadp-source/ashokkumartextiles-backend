// Razorpay status endpoint for Vercel
export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const hasSecret = !!process.env.RAZORPAY_KEY_SECRET;
  const currentMode = keyId?.startsWith('rzp_live') ? 'LIVE' : 'TEST';
  
  res.json({
    mode: currentMode,
    keyIdPrefix: keyId ? keyId.substring(0, 8) + '...' : 'NOT_SET',
    hasSecret: hasSecret,
    status: keyId && hasSecret ? 'CONFIGURED' : 'MISCONFIGURED',
    timestamp: new Date().toISOString(),
    service: 'razorpay-payment-gateway',
    version: '1.0.0'
  });
}