import { rewrite, next } from '@vercel/edge';

const CRAWLER_RE =
  /bot|crawl|spider|facebook|twitter|linkedin|whatsapp|slack|discord|telegram|pinterest|applebot|bingbot|yandex|baidu|semrush|ahrefs/i;

const SEO_ROUTES = new Set(['/', '/professionals', '/jobs', '/login', '/help']);

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  const path = url.pathname;
  const ua = request.headers.get('user-agent') || '';

  // Skip non-HTML requests
  if (
    path.startsWith('/assets/') ||
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|webp|avif)(\?.*)?$/i.test(path)
  ) {
    return next();
  }

  // Only intercept crawlers on known SEO routes
  const isCrawler = CRAWLER_RE.test(ua);
  const isSeoRoute = SEO_ROUTES.has(path) || /^\/professionals\/[^/]+$/.test(path);

  if (isCrawler && isSeoRoute) {
    return rewrite(new URL(`/api/og?route=${encodeURIComponent(path.slice(1))}`, request.url));
  }

  return next();
}

export const config = {
  matcher: ['/((?!assets/|api/).*)'],
};
