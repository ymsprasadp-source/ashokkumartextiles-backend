// Health check API endpoint for Vercel
import { handleCors } from './_cors.js';

export default function handler(req, res) {
  const corsResponse = handleCors(req, res, ['GET', 'OPTIONS']);
  if (corsResponse) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keyId = process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID;
  const currentMode = keyId?.startsWith('rzp_live') ? 'LIVE' : 'TEST';

  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    mode: currentMode,
    service: '3rd-client-payment-server',
    version: '2.0.0'
  });
}
