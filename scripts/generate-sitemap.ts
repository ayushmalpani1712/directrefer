import { COMPANIES, ROLES } from '../src/data/referral-seo'

const BASE_URL = 'https://www.directrefer.in'

function generateSitemap(): string {
  const urls: string[] = []

  // Static pages
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/about', priority: '0.8', changefreq: 'monthly' },
    { path: '/help', priority: '0.7', changefreq: 'monthly' },
    { path: '/privacy', priority: '0.5', changefreq: 'yearly' },
    { path: '/terms', priority: '0.5', changefreq: 'yearly' },
    { path: '/cookies', priority: '0.5', changefreq: 'yearly' },
    { path: '/contact', priority: '0.7', changefreq: 'monthly' },
    { path: '/login', priority: '0.6', changefreq: 'monthly' },
    { path: '/referral-jobs', priority: '0.9', changefreq: 'weekly' },
    // Phase 5 audience pages
    { path: '/for/freshers', priority: '0.8', changefreq: 'monthly' },
    { path: '/for/mba-students', priority: '0.8', changefreq: 'monthly' },
    { path: '/for/career-switchers', priority: '0.7', changefreq: 'monthly' },
    { path: '/for/experienced', priority: '0.7', changefreq: 'monthly' },
    { path: '/guides', priority: '0.7', changefreq: 'weekly' },
    { path: '/success-stories', priority: '0.7', changefreq: 'weekly' },
  ]

  // Guide detail pages
  const guideSlugs = [
    'how-to-get-a-referral',
    'referral-request-best-practices',
    'employee-referral-vs-job-boards',
    'how-to-be-a-good-referrer',
    'tech-job-referral-guide-2024',
    'referral-request-email-templates',
  ]
  for (const slug of guideSlugs) {
    staticPages.push({ path: `/guides/${slug}`, priority: '0.7', changefreq: 'monthly' })
  }

  for (const page of staticPages) {
    urls.push(`  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`)
  }

  // Company referral pages
  for (const company of COMPANIES) {
    urls.push(`  <url>
    <loc>${BASE_URL}/referral/${company.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`)
  }

  // Company + Role pages (top combinations)
  for (const company of COMPANIES) {
    for (const role of ROLES.slice(0, 10)) {
      urls.push(`  <url>
    <loc>${BASE_URL}/referral/${company.slug}/${role.slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`)
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
}

// Generate and write to public/sitemap.xml
import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const sitemap = generateSitemap()
const outputPath = resolve(__dirname, '../public/sitemap.xml')
writeFileSync(outputPath, sitemap)
console.log(`Sitemap generated at ${outputPath}`)
console.log(`Total URLs: ${sitemap.split('<url>').length - 1}`)
