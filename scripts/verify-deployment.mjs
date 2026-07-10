#!/usr/bin/env node

/**
 * Deployment Verification Script
 *
 * Runs automated checks to verify production deployment is ready.
 * Use after completing infrastructure setup (Vercel secret, Supabase schema, etc.)
 *
 * Usage: npm run verify:deploy
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

const checks = {
  passed: [],
  failed: [],
  warnings: [],
};

console.log('🔍 Running Deployment Verification Checks...\n');

// Check 1: Required files exist
console.log('Check 1: Required files');
const requiredFiles = [
  'package.json',
  'next.config.js',
  'tsconfig.json',
  'tailwind.config.ts',
  'supabase/schema.sql',
];

requiredFiles.forEach((file) => {
  const filePath = path.join(rootDir, file);
  if (fs.existsSync(filePath)) {
    checks.passed.push(`✅ ${file} exists`);
  } else {
    checks.failed.push(`❌ ${file} NOT FOUND`);
  }
});

// Check 2: Environment variables documented
console.log('\nCheck 2: Environment configuration');
const envExamplePath = path.join(rootDir, '.env.example');
if (fs.existsSync(envExamplePath)) {
  const envContent = fs.readFileSync(envExamplePath, 'utf-8');
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GITHUB_TOKEN',
  ];

  requiredVars.forEach((variable) => {
    if (envContent.includes(variable)) {
      checks.passed.push(`✅ ${variable} documented in .env.example`);
    } else {
      checks.warnings.push(`⚠️  ${variable} not found in .env.example`);
    }
  });
} else {
  checks.warnings.push('⚠️  .env.example not found');
}

// Check 3: Build artifacts
console.log('\nCheck 3: Build output');
const nextBuildPath = path.join(rootDir, '.next');
if (fs.existsSync(nextBuildPath)) {
  checks.passed.push(`✅ .next build directory exists`);

  // Check for both locales in i18n setup (if applicable)
  const serverPath = path.join(nextBuildPath, 'server');
  if (fs.existsSync(serverPath)) {
    checks.passed.push(`✅ Server-side build present`);
  }
} else {
  checks.warnings.push(
    '⚠️  .next directory not found (run "npm run build" first)'
  );
}

// Check 4: Database schema
console.log('\nCheck 4: Database schema');
const schemaPath = path.join(rootDir, 'supabase/schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaContent = fs.readFileSync(schemaPath, 'utf-8');

  const requiredTables = [
    'workspaces',
    'workspace_members',
    'ai_systems',
    'risk_assessments',
  ];

  requiredTables.forEach((table) => {
    if (schemaContent.includes(`CREATE TABLE ${table}`)) {
      checks.passed.push(`✅ Table '${table}' defined in schema.sql`);
    } else {
      checks.failed.push(`❌ Table '${table}' NOT found in schema.sql`);
    }
  });

  // Check for RLS policies
  if (schemaContent.includes('CREATE POLICY')) {
    const policyCount = (schemaContent.match(/CREATE POLICY/g) || []).length;
    checks.passed.push(`✅ ${policyCount} RLS policies defined`);
  } else {
    checks.failed.push('❌ No RLS policies found in schema.sql');
  }
} else {
  checks.failed.push('❌ supabase/schema.sql NOT FOUND');
}

// Check 5: Documentation
console.log('\nCheck 5: Documentation');
const docsToCheck = [
  'docs/DEPLOYMENT-CHECKLIST.md',
  'docs/STAGING-VERIFICATION.md',
  'docs/CUSTOMER-GUIDES.md',
  'docs/CUSTOMER-SUCCESS-PLAYBOOK.md',
  'docs/LAUNCH-READINESS-SUMMARY.md',
  'docs/FOUNDER-EXECUTIVE-BRIEF.md',
];

docsToCheck.forEach((doc) => {
  const docPath = path.join(rootDir, doc);
  if (fs.existsSync(docPath)) {
    checks.passed.push(`✅ ${path.basename(doc)}`);
  } else {
    checks.failed.push(`❌ ${doc} NOT FOUND`);
  }
});

// Check 6: Tests
console.log('\nCheck 6: Test suite');
const testsPath = path.join(rootDir, 'tests');
if (fs.existsSync(testsPath)) {
  const testFiles = fs.readdirSync(testsPath).filter((f) =>
    f.endsWith('.test.ts')
  );
  if (testFiles.length > 0) {
    checks.passed.push(`✅ ${testFiles.length} test files present`);
  } else {
    checks.warnings.push('⚠️  No test files found');
  }
} else {
  checks.failed.push('❌ tests/ directory NOT FOUND');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));

if (checks.passed.length > 0) {
  console.log(`\n✅ PASSED (${checks.passed.length}):`);
  checks.passed.forEach((check) => console.log(`  ${check}`));
}

if (checks.warnings.length > 0) {
  console.log(`\n⚠️  WARNINGS (${checks.warnings.length}):`);
  checks.warnings.forEach((check) => console.log(`  ${check}`));
}

if (checks.failed.length > 0) {
  console.log(`\n❌ FAILED (${checks.failed.length}):`);
  checks.failed.forEach((check) => console.log(`  ${check}`));
}

console.log('\n' + '='.repeat(60));
console.log('DEPLOYMENT READINESS');
console.log('='.repeat(60));

if (checks.failed.length === 0) {
  console.log('✅ Code and documentation ready for deployment!');
  console.log('\nNext steps:');
  console.log('1. Complete infrastructure tasks (DEPLOYMENT-CHECKLIST.md)');
  console.log('2. Run staging verification (STAGING-VERIFICATION.md)');
  console.log('3. Merge PR #48 to main');
  console.log('4. Test production deployment');
  console.log('5. Invite first customer\n');
  process.exit(0);
} else {
  console.log('❌ Fix issues above before proceeding with deployment.\n');
  process.exit(1);
}
