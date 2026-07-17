import { chromium } from 'playwright';

const BASE_URL = process.argv[2] || 'https://newspulse-ai-git-claude-alpha-c-1777d4-lalit-kumar-d-s-projects.vercel.app';
const PAGES = ['/', '/auth/signup', '/auth/signin', '/workspace', '/inventory', '/assessment', '/compliance', '/team'];

console.log('🚀 EURO AI Production Performance (Vercel)');
console.log(`📍 Testing: ${BASE_URL}`);
console.log(`📝 Pages: ${PAGES.length}`);
console.log('');

const results = [];
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

try {
  for (const page of PAGES) {
    try {
      const pageURL = `${BASE_URL}${page}`;
      const context = await browser.newContext();
      const pageObj = await context.newPage();

      const start = performance.now();
      await pageObj.goto(pageURL, { waitUntil: 'networkidle', timeout: 60000 });
      const end = performance.now();
      const loadTime = Math.round(end - start);

      results.push({ page, loadTime, status: '✅' });
      console.log(`  ✅ ${page}: ${loadTime}ms`);

      await context.close();
    } catch (err) {
      results.push({ page, status: '❌', error: err.message });
      console.log(`  ❌ ${page}: Error`);
    }
  }
} finally {
  await browser.close();
}

const successful = results.filter((r) => r.status === '✅');
if (successful.length > 0) {
  const avgTime = Math.round(
    successful.reduce((sum, r) => sum + r.loadTime, 0) / successful.length
  );
  const maxTime = Math.max(...successful.map((r) => r.loadTime));
  const minTime = Math.min(...successful.map((r) => r.loadTime));
  console.log('');
  console.log('📈 Summary');
  console.log(`Average: ${avgTime}ms | Max: ${maxTime}ms | Min: ${minTime}ms`);
  console.log(`Successful: ${successful.length}/${PAGES.length}`);
}
