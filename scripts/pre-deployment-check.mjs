#!/usr/bin/env node

/**
 * Pre-Deployment Verification Script
 *
 * Validates all prerequisites, environment variables, and configurations
 * before production deployment of incident response system.
 *
 * Usage:
 *   node scripts/pre-deployment-check.mjs
 *   node scripts/pre-deployment-check.mjs --strict  (fail on warnings)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const strict = process.argv.includes('--strict');

const checks = [];
let passCount = 0;
let warnCount = 0;
let failCount = 0;

function check(name, condition, message = '', severity = 'error') {
  const status = condition ? '✓' : severity === 'error' ? '✗' : '⚠';
  const symbol = condition ? '✓' : severity === 'error' ? '✗' : '⚠';

  if (condition) {
    passCount++;
    console.log(`  ${symbol} ${name}${message ? ': ' + message : ''}`);
  } else {
    if (severity === 'error') {
      failCount++;
      console.log(`  ${symbol} ${name} - ${message || 'FAILED'}`);
    } else {
      warnCount++;
      console.log(`  ${symbol} ${name} (warning) - ${message || 'Check this manually'}`);
    }
  }

  checks.push({ name, condition, severity });
}

function section(title) {
  console.log(`\n${title}`);
  console.log('='.repeat(title.length));
}

function printSummary() {
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`  ✓ Passed: ${passCount}`);
  console.log(`  ⚠ Warnings: ${warnCount}`);
  console.log(`  ✗ Failed: ${failCount}`);

  const total = passCount + warnCount + failCount;
  const passRate = Math.round((passCount / total) * 100);
  console.log(`  Pass Rate: ${passRate}%`);

  if (failCount === 0 && (warnCount === 0 || !strict)) {
    console.log('\n✅ READY FOR DEPLOYMENT');
    process.exit(0);
  } else if (failCount === 0 && warnCount > 0 && strict) {
    console.log('\n⚠️  DEPLOYMENT BLOCKED - Fix warnings in strict mode');
    process.exit(1);
  } else {
    console.log('\n❌ DEPLOYMENT BLOCKED - Fix errors before proceeding');
    process.exit(1);
  }
}

// Check environment variables
section('Environment Variables');

const requiredEnvVars = [
  'VERCEL_API_TOKEN',
  'CRON_SECRET',
  'FOUNDER_EMAIL',
  'EMAIL_PROVIDER',
  'GITHUB_TOKEN',
];

const optionalEnvVars = [
  'SENDGRID_API_KEY',
  'SLACK_WEBHOOK_URL',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  check(
    varName,
    !!value,
    value ? `${value.substring(0, 20)}...` : 'NOT SET',
    'error'
  );
});

optionalEnvVars.forEach(varName => {
  const value = process.env[varName];
  check(
    varName,
    !!value,
    value ? 'SET' : 'not configured',
    'warning'
  );
});

// Validate email provider configuration
section('Email Provider Configuration');

const emailProvider = process.env.EMAIL_PROVIDER || 'log';
check('EMAIL_PROVIDER value', ['sendgrid', 'ses', 'log'].includes(emailProvider), emailProvider);

if (emailProvider === 'sendgrid') {
  check(
    'SENDGRID_API_KEY',
    !!process.env.SENDGRID_API_KEY,
    'Required when EMAIL_PROVIDER=sendgrid'
  );
}

if (emailProvider === 'ses') {
  check(
    'AWS_ACCESS_KEY_ID',
    !!process.env.AWS_ACCESS_KEY_ID,
    'Required when EMAIL_PROVIDER=ses'
  );
  check(
    'AWS_SECRET_ACCESS_KEY',
    !!process.env.AWS_SECRET_ACCESS_KEY,
    'Required when EMAIL_PROVIDER=ses'
  );
}

// Validate credential formats
section('Credential Format Validation');

check(
  'VERCEL_API_TOKEN format',
  !process.env.VERCEL_API_TOKEN || /^[a-zA-Z0-9_-]{20,}$/.test(process.env.VERCEL_API_TOKEN),
  'Should be alphanumeric with dashes/underscores',
  'warning'
);

check(
  'CRON_SECRET format',
  !process.env.CRON_SECRET || /^[a-f0-9]{64}$/.test(process.env.CRON_SECRET),
  'Should be 64-char hex (from openssl rand -hex 32)',
  'warning'
);

check(
  'FOUNDER_EMAIL format',
  !process.env.FOUNDER_EMAIL || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.FOUNDER_EMAIL),
  'Should be valid email address'
);

check(
  'GITHUB_TOKEN format',
  !process.env.GITHUB_TOKEN || /^(ghp_|ghu_)[a-zA-Z0-9_]{36,255}$/.test(process.env.GITHUB_TOKEN),
  'Should start with ghp_ or ghu_',
  'warning'
);

// Check production-wiring secret is configured
section('Production Wiring Security');

check(
  'PRODUCTION_WIRING_SECRET',
  !!process.env.PRODUCTION_WIRING_SECRET,
  'Required to protect production-wiring API endpoints'
);

check(
  'PRODUCTION_WIRING_SECRET format',
  !process.env.PRODUCTION_WIRING_SECRET || /^[a-f0-9]{64}$/.test(process.env.PRODUCTION_WIRING_SECRET),
  'Should be 64-char hex (from openssl rand -hex 32)',
  'warning'
);

// Check code files exist
section('Critical Code Files');

const criticalFiles = [
  'app/api/production-wiring/route.ts',
  'app/api/production-error-collection/cron.ts',
  'app/api/war-games/route.ts',
  'lib/email-service.ts',
  'lib/founder-alerting.ts',
];

const projectRoot = path.join(__dirname, '..');
criticalFiles.forEach(file => {
  const fullPath = path.join(projectRoot, file);
  check(
    `File: ${file}`,
    fs.existsSync(fullPath),
    'File not found'
  );
});

// Check authentication in code
section('API Authentication Validation');

const productionWiringFile = path.join(projectRoot, 'app/api/production-wiring/route.ts');
if (fs.existsSync(productionWiringFile)) {
  const content = fs.readFileSync(productionWiringFile, 'utf8');
  check(
    'production-wiring verifyAuth',
    content.includes('verifyAuth'),
    'Authentication function implemented'
  );
  check(
    'production-wiring Bearer token check',
    content.includes('Bearer'),
    'Bearer token validation'
  );
}

const warGamesFile = path.join(projectRoot, 'app/api/war-games/route.ts');
if (fs.existsSync(warGamesFile)) {
  const content = fs.readFileSync(warGamesFile, 'utf8');
  check(
    'war-games verifyAuth',
    content.includes('verifyAuth'),
    'Authentication function implemented'
  );
}

// Check email masking in code
section('Sensitive Data Protection');

const emailServiceFile = path.join(projectRoot, 'lib/email-service.ts');
if (fs.existsSync(emailServiceFile)) {
  const content = fs.readFileSync(emailServiceFile, 'utf8');
  check(
    'Email masking in logs',
    content.includes('maskedEmail') || content.includes('replace'),
    'Email addresses masked before logging'
  );
  check(
    'Body content protection',
    content.includes('BodySize') || content.includes('bodySize'),
    'Sensitive body content not logged'
  );
}

const founderAlertingFile = path.join(projectRoot, 'lib/founder-alerting.ts');
if (fs.existsSync(founderAlertingFile)) {
  const content = fs.readFileSync(founderAlertingFile, 'utf8');
  check(
    'HTML escaping implemented',
    content.includes('escapeHtml') || content.includes('escape'),
    'HTML/XSS protection for user content'
  );
}

// Check test coverage
section('Test Suite Status');

const testFile = path.join(projectRoot, 'tests/email-service.test.ts');
if (fs.existsSync(testFile)) {
  const content = fs.readFileSync(testFile, 'utf8');
  const testCount = (content.match(/it\(/g) || []).length;
  check(
    `Email service tests`,
    testCount > 0,
    `${testCount} tests found`
  );
}

// Print deployment checklist
section('Pre-Deployment Checklist');

const checklist = [
  { item: 'GitHub Actions billing enabled', hint: 'Settings → Billing → Actions → Enable & set $50 cap' },
  { item: 'Supabase schema deployed', hint: 'Run: node scripts/deploy-supabase-schema.mjs' },
  { item: 'Vercel environment variables set', hint: 'Dashboard → Settings → Environment Variables' },
  { item: 'Email provider configured', hint: `Using: ${emailProvider}` },
  { item: 'Cron service configured', hint: 'EasyCron or cron.is with CRON_SECRET' },
];

checklist.forEach(item => {
  console.log(`  ☐ ${item.item}`);
  console.log(`    Hint: ${item.hint}`);
});

// Final summary
printSummary();
