const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'https://ashokkumartextiles-frontend.vercel.app',
  'https://ashok-textiles.vercel.app',
  'https://textiles2.vercel.app',
  'https://www.ashokkumartextiles.com',
  'https://ashokkumartextiles.com'
];

const DEFAULT_ALLOWED_PATTERNS = [
  /^https:\/\/ashokkumartextiles-frontend(?:-[a-z0-9-]+)?\.vercel\.app$/i
];

function parseAllowedOriginsFromEnv() {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin) {
  if (!origin) return true;

  const allowlist = new Set([...DEFAULT_ALLOWED_ORIGINS, ...parseAllowedOriginsFromEnv()]);
  if (allowlist.has(origin)) return true;

  return DEFAULT_ALLOWED_PATTERNS.some((pattern) => pattern.test(origin));
}

export function handleCors(req, res, allowedMethods) {
  const origin = req.headers.origin;
  const methods = allowedMethods.join(', ');

  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-admin-token, Accept');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (origin && !isAllowedOrigin(origin)) {
    return res.status(403).json({
      error: 'CORS origin not allowed',
      origin
    });
  }

  return null;
}
