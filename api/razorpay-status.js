// Razorpay status endpoint for Vercel
import { handleCors } from './_cors.js';

export default function handler(req, res) {
  const corsResponse = handleCors(req, res, ['GET', 'OPTIONS']);
  if (corsResponse) return;

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
