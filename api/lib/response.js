/**
 * Standard JSON response helper.
 */
export function jsonResponse(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/**
 * Success response.
 */
export function success(res, data, status = 200) {
  return jsonResponse(res, status, { success: true, data });
}

/**
 * Created response.
 */
export function created(res, data) {
  return jsonResponse(res, 201, { success: true, data });
}

/**
 * Error response.
 */
export function error(res, message, status = 500, details = null) {
  const body = { success: false, error: message };
  if (details) body.details = details;
  return jsonResponse(res, status, body);
}

/**
 * Parse JSON body from request.
 */
export function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

/**
 * Extract query parameters from URL.
 */
export function parseQuery(url) {
  const idx = url.indexOf('?');
  if (idx === -1) return {};
  const params = new URLSearchParams(url.slice(idx));
  const obj = {};
  for (const [k, v] of params) obj[k] = v;
  return obj;
}

/**
 * Extract path parameters (e.g., /api/jobs/:id).
 */
export function extractPathParam(url, pattern) {
  const urlParts = url.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  if (urlParts.length !== patternParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = urlParts[i];
    } else if (urlParts[i] !== patternParts[i]) {
      return null;
    }
  }
  return params;
}
