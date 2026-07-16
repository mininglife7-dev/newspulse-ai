#!/usr/bin/env node

/**
 * Phase 2 Execution Trigger Script
 *
 * Triggers Phase 2 execution when:
 * - Supabase schema is deployed
 * - Test data is populated
 * - Application is ready
 *
 * Usage:
 *   node scripts/trigger-phase-2.js [url]
 *   # Examples:
 *   node scripts/trigger-phase-2.js http://localhost:3000
 *   node scripts/trigger-phase-2.js https://preview.vercel.app
 */

const https = require('https');
const http = require('http');

async function triggerPhase2(baseUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}/api/phase-2-status`);
    const protocol = url.protocol === 'https:' ? https : http;

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = protocol.request(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: json,
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data,
          });
        }
      });
    });

    req.on('error', reject);

    // Send request body
    req.write(JSON.stringify({ action: 'begin-phase-2' }));
    req.end();
  });
}

async function main() {
  const baseUrl = process.argv[2] || 'http://localhost:3000';

  console.log('[PHASE-2] Triggering Phase 2 execution...');
  console.log(`[PHASE-2] Target: ${baseUrl}`);
  console.log('[PHASE-2]');

  try {
    const result = await triggerPhase2(baseUrl);

    console.log(`[PHASE-2] Response Status: ${result.statusCode}`);
    console.log('[PHASE-2] Response Body:');
    console.log(JSON.stringify(result.body, null, 2));

    if (result.statusCode === 200) {
      console.log('[PHASE-2]');
      console.log('✅ Phase 2 execution triggered successfully');
      process.exit(0);
    } else if (result.statusCode === 409) {
      console.log('[PHASE-2]');
      console.log(
        '⚠️  Phase 2 not ready. Prerequisites not met:',
        result.body.message
      );
      process.exit(1);
    } else {
      console.log('[PHASE-2]');
      console.log(
        '❌ Error triggering Phase 2:',
        result.body.error || result.body
      );
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Failed to trigger Phase 2:', error.message);
    process.exit(1);
  }
}

main();
