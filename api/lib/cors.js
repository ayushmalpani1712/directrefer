const ALLOWED_ORIGINS = [
  'https://www.directrefer.in',
  'https://directrefer.in',
  'http://localhost:5173',
  'http://localhost:3000',
];

export function getCorsHeaders(req) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-Id',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCors(req, res) {
  const headers = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return true;
  }
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  return false;
}
