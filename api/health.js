// Health check API endpoint for Vercel
// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ashokkumartextiles-frontend.vercel.app',
  'https://ashok-textiles.vercel.app',
  'https://textiles2.vercel.app',
  'https://www.ashokkumartextiles.com',
  'https://ashokkumartextiles.com'
];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  
  // Only set CORS headers for allowed origins
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default function handler(req, res) {
  // Set CORS headers for all requests
  setCorsHeaders(req, res);

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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