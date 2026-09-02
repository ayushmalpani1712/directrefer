import { getServiceClient, handleCors, authenticate, getCorsHeaders, signResumeToken, verifyResumeToken } from './_lib.js';

// ── Resume Proxy ─────────────────────────────────────────
// Serves resume PDFs from Supabase Storage without exposing the raw URL.
//
// Auth methods (in priority order):
//   1. Authorization: Bearer <jwt> header (for API/fetch calls)
//   2. ?token=<hmac_signed> query param (for browser navigation without auth headers)
//
// Modes:
//   ?mode=preview  → Content-Disposition: inline  (renders in browser)
//   ?mode=download → Content-Disposition: attachment (triggers download)
//   (default is download)
//
// Token generation:
//   ?sign=true with Bearer auth → returns JSON { token, expires, previewUrl, downloadUrl }

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: 'Method not allowed' }));
  }

  try {
    const urlObj = new URL(req.url, 'http://localhost');
    const mode = urlObj.searchParams.get('mode') || 'download';
    const signOnly = urlObj.searchParams.get('sign') === 'true';
    const signedToken = urlObj.searchParams.get('token');

    // Extract userId from URL path
    const pathMatch = req.url.match(/\/api\/resume\/([0-9a-f-]{36})/i);
    const userId = pathMatch ? pathMatch[1] : null;

    if (!userId || !/^[0-9a-f-]{36}$/i.test(userId)) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Invalid user ID' }));
    }

    // Authenticate: try Bearer header first, then signed token
    let authUserId = null;
    let authProfile = null;

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const auth = await authenticate(req);
      if (auth.error) {
        res.writeHead(auth.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: auth.error }));
      }
      authUserId = auth.user.id;
      authProfile = auth.profile;
    } else if (signedToken) {
      const tokenUserId = verifyResumeToken(signedToken);
      if (!tokenUserId) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Invalid or expired token' }));
      }
      authUserId = tokenUserId;
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Missing authentication' }));
    }

    // Access control: owner or admin
    if (authUserId !== userId && (!authProfile || authProfile.role !== 'admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Forbidden' }));
    }

    // Token generation mode: return signed URLs
    if (signOnly) {
      if (!authHeader?.startsWith('Bearer ')) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ success: false, error: 'Token generation requires Bearer auth' }));
      }
      const token = signResumeToken(userId);
      const baseUrl = `${urlObj.protocol}//${urlObj.host}`;
      res.writeHead(200, { 'Content-Type': 'application/json', ...getCorsHeaders(req) });
      return res.end(JSON.stringify({
        success: true,
        token,
        previewUrl: `/api/resume/${userId}?token=${token}&mode=preview`,
        downloadUrl: `/api/resume/${userId}?token=${token}&mode=download`,
      }));
    }

    const supabase = getServiceClient();

    // Read the CURRENT file path and name from DB
    const { data: profile, error: dbError } = await supabase
      .from('profiles_job_seeker')
      .select('resume_url, resume_name, resume_uploaded_at')
      .eq('user_id', userId)
      .single();

    if (dbError || !profile?.resume_url) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'No resume found' }));
    }

    // Extract storage path from the resume_url
    const storageMatch = profile.resume_url.match(/\/storage\/v\d+\/object\/(?:public\/|sign\/)?resumes\/(.+?)(?:\?.*)?$/);
    if (!storageMatch) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Invalid resume URL' }));
    }

    const filePath = storageMatch[1];

    // Download the file from Supabase Storage using service role key
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Resume download error:', downloadError);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: 'Failed to download resume' }));
    }

    // Convert Blob to Buffer
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Branded filename: use the original filename if available, else fallback
    const resumeName = profile.resume_name || 'Resume.pdf';
    const safeFilename = resumeName.replace(/[^a-zA-Z0-9_\-.\s]/g, '_');

    const disposition = mode === 'preview' ? 'inline' : 'attachment';

    const headers = getCorsHeaders(req);
    res.writeHead(200, {
      ...headers,
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(safeFilename)}`,
      'Content-Length': buffer.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.end(buffer);
  } catch (err) {
    console.error('resume proxy error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: false, error: err.message || 'Internal server error' }));
  }
}
