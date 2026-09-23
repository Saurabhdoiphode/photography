const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BASE_URL = process.env.SITE_URL || 'https://omkardoiphodephotographyy.netlify.app';

const STATIC_PAGES = [''];
const EXCLUDE = new Set(['admin-dashboard.html', 'admin-login.html']);

function getHtmlFiles(dir) {
  const files = fs.readdirSync(dir);
  let pages = [];
  for (const file of files) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      pages = pages.concat(getHtmlFiles(full));
    } else if (file.endsWith('.html') && !EXCLUDE.has(file)) {
      const rel = path.relative(PUBLIC_DIR, full).replace(/\\/g, '/');
      pages.push('/' + rel.replace(/index\.html$/, ''));
    }
  }
  return pages;
}

exports.handler = async () => {
  const dynamicPages = getHtmlFiles(PUBLIC_DIR);
  const allPages = [...new Set([...STATIC_PAGES, ...dynamicPages])];

  const urls = allPages
    .map(p => {
      const url = `${BASE_URL}${p || '/'}`;
      return `  <url><loc>${url}</loc><changefreq>weekly</changefreq><priority>${p === '' ? '1.0' : '0.8'}</priority></url>`;
    })
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600' },
    body: sitemap,
  };
};