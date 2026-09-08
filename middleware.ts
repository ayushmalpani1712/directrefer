import { next } from '@vercel/edge';

const CRAWLER_RE =
  /bot|crawl|spider|facebook|twitter|linkedin|whatsapp|slack|discord|telegram|pinterest|applebot|bingbot|yandex|baidu|semrush|ahrefs/i;

export default function middleware(request: Request): Response {
  const url = new URL(request.url);
  const path = url.pathname;

  if (
    path.startsWith('/assets/') ||
    path.startsWith('/api/') ||
    path.startsWith('/_next/') ||
    /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json|webp|avif)(\?.*)?$/i.test(path)
  ) {
    return next();
  }

  const response = next();
  response.headers.set('Cache-Control', 'no-cache, must-revalidate');
  return response;
}

export const config = {
  matcher: ['/((?!assets/|api/).*)'],
};
