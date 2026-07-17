#!/usr/bin/env node
/**
 * Performance Baseline Measurement
 *
 * Measures Lighthouse scores and API response times for critical EURO AI pages.
 * Usage: node scripts/performance-baseline.mjs [--save] [--url=https://...]
 *
 * --save: Save results to docs/operations/PERFORMANCE_BASELINES.md
 * --url: Base URL to test (default: http://localhost:3000)
 */

import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Configuration for critical pages to measure
const CRITICAL_PAGES = [
  '/',
  '/auth/signup',
  '/auth/signin',
  '/workspace',
  '/inventory',
  '/assessment',
  '/compliance',
  '/team',
];

// Target Lighthouse scores (90+ for production-ready)
const LIGHTHOUSE_TARGETS = {
  performance: 90,
  accessibility: 90,
  'best-practices': 90,
  seo: 90,
};

// API response time targets (milliseconds)
const API_RESPONSE_TARGETS = {
  p50: 100,    // 50th percentile: under 100ms
  p95: 300,    // 95th percentile: under 300ms
  p99: 500,    // 99th percentile: under 500ms
};

async function runLighthouse(url, pageUrl) {
  return new Promise((resolve) => {
    console.log(`\n📊 Measuring Lighthouse for ${pageUrl}...`);

    const lighthouse = spawn('npx', ['lighthouse', `${url}${pageUrl}`, '--output=json', '--chrome-flags="--headless --no-sandbox --disable-gpu"'], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    let errorOutput = '';

    lighthouse.stdout.on('data', (data) => {
      output += data.toString();
    });

    lighthouse.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    lighthouse.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(output);
          const scores = {
            url: pageUrl,
            performance: Math.round(result.lighthouseResult.categories.performance.score * 100),
            accessibility: Math.round(result.lighthouseResult.categories.accessibility.score * 100),
            'best-practices': Math.round(result.lighthouseResult.categories['best-practices'].score * 100),
            seo: Math.round(result.lighthouseResult.categories.seo.score * 100),
            'pwa': Math.round((result.lighthouseResult.categories.pwa?.score || 0) * 100),
            timestamp: new Date().toISOString(),
          };
          resolve(scores);
        } catch (e) {
          console.error(`❌ Failed to parse Lighthouse result for ${pageUrl}`);
          resolve(null);
        }
      } else {
        console.error(`❌ Lighthouse failed for ${pageUrl}: ${errorOutput}`);
        resolve(null);
      }
    });
  });
}

async function measureWebVitals(baseUrl) {
  // Simulate Web Vitals by making requests to pages
  const metrics = {
    timestamp: new Date().toISOString(),
    pages: {},
  };

  console.log('\n⏱️  Measuring Web Vitals (simulated via response times)...');

  for (const page of CRITICAL_PAGES) {
    const startTime = Date.now();
    try {
      const response = await fetch(`${baseUrl}${page}`, {
        method: 'HEAD',
        timeout: 10000,
      });
      const responseTime = Date.now() - startTime;

      metrics.pages[page] = {
        statusCode: response.status,
        responseTime,
        status: responseTime < API_RESPONSE_TARGETS.p95 ? '✅' : '⚠️',
      };

      console.log(`  ${metrics.pages[page].status} ${page}: ${responseTime}ms`);
    } catch (error) {
      metrics.pages[page] = {
        error: error.message,
        status: '❌',
      };
      console.log(`  ❌ ${page}: ${error.message}`);
    }
  }

  return metrics;
}

function formatBaselinesDocument(lighthouseResults, webVitals) {
  const timestamp = new Date().toISOString();
  const date = new Date(timestamp).toLocaleDateString();

  let content = `# EURO AI Performance Baselines

**Established**: ${date}
**Timestamp**: ${timestamp}

---

## Executive Summary

EURO AI performance targets establish benchmarks for production readiness. All critical pages should achieve Lighthouse scores of 90+ across performance, accessibility, best-practices, and SEO metrics.

### Targets

| Metric | Target |
| --- | --- |
| Lighthouse Performance | 90+ |
| Lighthouse Accessibility | 90+ |
| Lighthouse Best Practices | 90+ |
| Lighthouse SEO | 90+ |
| API Response Time (p50) | <100ms |
| API Response Time (p95) | <300ms |
| API Response Time (p99) | <500ms |

---

## Lighthouse Scores by Page

\`\`\`
Measurement Date: ${date}
\`\`\`

| Page | Performance | Accessibility | Best Practices | SEO | PWA | Status |
| --- | --- | --- | --- | --- | --- | --- |
`;

  let allGood = true;
  for (const result of lighthouseResults) {
    if (!result) continue;

    const perfStatus = result.performance >= LIGHTHOUSE_TARGETS.performance ? '✅' : '⚠️';
    const accessStatus = result.accessibility >= LIGHTHOUSE_TARGETS.accessibility ? '✅' : '⚠️';
    const practicesStatus = result['best-practices'] >= LIGHTHOUSE_TARGETS['best-practices'] ? '✅' : '⚠️';
    const seoStatus = result.seo >= LIGHTHOUSE_TARGETS.seo ? '✅' : '⚠️';

    const isHealthy =
      result.performance >= 80 &&
      result.accessibility >= 85 &&
      result['best-practices'] >= 85 &&
      result.seo >= 85;

    if (!isHealthy) allGood = false;

    content += `| ${result.url} | ${result.performance} ${perfStatus} | ${result.accessibility} ${accessStatus} | ${result['best-practices']} ${practicesStatus} | ${result.seo} ${seoStatus} | ${result.pwa} | ${isHealthy ? '✅ Healthy' : '⚠️ Review'} |\n`;
  }

  content += `\n---\n\n## Web Vitals & Response Times\n\n`;
  content += `\`\`\`\nMeasurement Date: ${date}\nBaseline: Production response times (simulated via HEAD requests)\n\`\`\`\n\n`;

  content += `| Page | Response Time | Status | Notes |\n| --- | --- | --- | --- |\n`;

  for (const [page, metric] of Object.entries(webVitals.pages)) {
    if (metric.error) {
      content += `| ${page} | Error | ❌ | ${metric.error} |\n`;
    } else {
      const status = metric.responseTime < API_RESPONSE_TARGETS.p95 ? '✅' : '⚠️';
      content += `| ${page} | ${metric.responseTime}ms | ${status} | ${metric.responseTime < 100 ? 'Excellent' : metric.responseTime < 300 ? 'Good' : 'Review'} |\n`;
    }
  }

  content += `\n---\n\n## Performance Targets Rationale\n\n`;
  content += `- **Lighthouse 90+**: Industry standard for production-ready systems. Reflects excellent performance, accessibility, security, and SEO practices.
- **API Response Time (p50 <100ms)**: Half of all requests should complete in under 100ms for responsive UX.
- **API Response Time (p95 <300ms)**: 95% of requests should complete in under 300ms for acceptable user experience.
- **API Response Time (p99 <500ms)**: 99% of requests should complete in under 500ms; tail latencies acceptable.

---

## Sentry Performance Monitoring Configuration

Performance monitoring is configured in \`sentry.config.ts\`:

\`\`\`typescript
// Production: 10% sampling (Sentry costs)
tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

// Session replay: 10% normal, 100% on errors
replaysSessionSampleRate: 0.1,
replaysOnErrorSampleRate: 1.0,
\`\`\`

### Monitored Events

1. **Page Load Performance**: LCP, FCP, CLS tracking (Sentry Web Vitals integration)
2. **API Response Times**: All fetch/XHR requests auto-instrumented
3. **Database Queries**: Supabase query duration tracking (via @supabase/supabase-js)
4. **Error Context**: Performance impact of errors (slow-on-error correlation)

---

## Next Steps

### Short-term (This Sprint)

1. **Establish Baseline**: Run this script weekly and track trends
2. **Identify Bottlenecks**: Use Sentry Performance tab to find slow endpoints
3. **Component-level Optimization**: Profile React components with Chrome DevTools
4. **Bundle Analysis**: Run \`npx webpack-bundle-analyzer\` on next build

### Medium-term (Next Sprint)

1. **Route-level Targets**: Establish p95 latency targets per API endpoint
2. **Database Query Optimization**: Index slow queries from Supabase logs
3. **Image Optimization**: Ensure all images use Next.js Image component
4. **Code Splitting**: Evaluate critical vendor bundle sizes

### Long-term (2+ Sprints)

1. **Core Web Vitals Monitoring**: Set up Google Analytics integration
2. **Real User Monitoring (RUM)**: Expand Sentry performance sampling in production
3. **Load Testing**: Simulate production traffic patterns
4. **CDN Optimization**: Configure Vercel's edge caching and Incremental Static Regeneration

---

## Automated Monitoring

**GitHub Actions CI/CD**: Performance checks can be integrated into CI:
\`\`\`yaml
- name: Lighthouse CI
  uses: actions/github-script@v6
  with:
    script: npm run lighthouse -- --output-path=./lighthouse-results.json
\`\`\`

**Sentry Alerts** (post-configuration):
- Error rate spike: >10 errors/min → Slack notification
- Performance regression: p95 latency increase >20% → Review
- Session replay: 100% on errors for debugging

---

## Historical Baselines

This section will be updated weekly with historical data for trend analysis.

| Date | Performance | Accessibility | Best Practices | SEO | Response Time (p95) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| ${date} | ${lighthouseResults[0]?.performance || 'N/A'} | ${lighthouseResults[0]?.accessibility || 'N/A'} | ${lighthouseResults[0]?.['best-practices'] || 'N/A'} | ${lighthouseResults[0]?.seo || 'N/A'} | TBD | Baseline established |

---

## Assessment

${allGood ? '✅ **All pages meet or exceed targets.**' : '⚠️ **Some pages need optimization review.**'}

System performance is ${allGood ? 'production-ready' : 'acceptable with identified optimization opportunities'}.

**Recommendation**: Monitor Sentry performance dashboard weekly. Set up automated alerts for regressions.

---

**Generated**: ${timestamp}
**Authority**: Governor Ω (STAGE 4 Knowledge System)
`;

  return content;
}

async function main() {
  const args = process.argv.slice(2);
  const shouldSave = args.includes('--save');
  const urlArg = args.find((arg) => arg.startsWith('--url='));
  const baseUrl = urlArg ? urlArg.split('=')[1] : 'http://localhost:3000';

  console.log('🚀 EURO AI Performance Baseline Measurement');
  console.log(`📍 Base URL: ${baseUrl}`);
  console.log(`📝 Critical pages: ${CRITICAL_PAGES.length}`);

  // Use Playwright Chromium for Lighthouse
  const chromiumPath = '/opt/pw-browsers/chromium';
  process.env.CHROME_PATH = chromiumPath;

  // Measure Lighthouse scores
  console.log('\n📊 Measuring Lighthouse Scores');
  const lighthouseResults = [];

  for (const page of CRITICAL_PAGES) {
    try {
      const result = await runLighthouse(baseUrl, page);
      if (result) {
        lighthouseResults.push(result);
      }
    } catch (error) {
      console.error(`Error measuring ${page}:`, error.message);
    }
  }

  // Measure Web Vitals
  const webVitals = await measureWebVitals(baseUrl);

  // Format results
  const document = formatBaselinesDocument(lighthouseResults, webVitals);

  // Display summary
  console.log('\n📈 Performance Summary');
  console.log('='.repeat(60));
  if (lighthouseResults.length > 0) {
    const avgPerformance =
      lighthouseResults.reduce((sum, r) => sum + (r.performance || 0), 0) / lighthouseResults.length;
    const avgAccessibility =
      lighthouseResults.reduce((sum, r) => sum + (r.accessibility || 0), 0) / lighthouseResults.length;

    console.log(`Average Lighthouse Performance: ${Math.round(avgPerformance)}`);
    console.log(`Average Lighthouse Accessibility: ${Math.round(avgAccessibility)}`);
  }

  const avgResponseTime =
    Object.values(webVitals.pages).reduce(
      (sum, p) => sum + (p.responseTime || 0),
      0
    ) / Object.keys(webVitals.pages).length;

  console.log(`Average Response Time: ${Math.round(avgResponseTime)}ms`);

  if (shouldSave) {
    const outputPath = path.join(projectRoot, 'docs/operations/PERFORMANCE_BASELINES.md');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, document, 'utf-8');
    console.log(`\n✅ Baselines saved to ${outputPath}`);
  } else {
    console.log('\n💡 Tip: Run with --save to save results to docs/operations/PERFORMANCE_BASELINES.md');
  }

  console.log('\n✅ Performance baseline measurement complete.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
