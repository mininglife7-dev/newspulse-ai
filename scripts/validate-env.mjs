#!/usr/bin/env node

/**
 * Environment Variable Validator
 * Verifies all required production environment variables before deployment
 * Usage: node scripts/validate-env.mjs [staging|production]
 */

const REQUIRED_VARS = {
  staging: [
    'VERCEL_API_TOKEN',
    'CRON_SECRET',
    'FOUNDER_EMAIL',
    'EMAIL_PROVIDER',
  ],
  production: [
    'VERCEL_API_TOKEN',
    'CRON_SECRET',
    'FOUNDER_EMAIL',
    'EMAIL_PROVIDER',
    'SENDGRID_API_KEY',
    'GITHUB_TOKEN',
  ],
};

const OPTIONAL_VARS = [
  'SLACK_WEBHOOK_URL',
];

function validateEnv(environment = 'staging') {
  const required = REQUIRED_VARS[environment] || REQUIRED_VARS.staging;
  const missing = [];
  const present = [];
  const optional = [];

  console.log(`\n📋 Validating ${environment} environment variables...\n`);

  for (const varName of required) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
      console.log(`❌ ${varName}: NOT SET`);
    } else {
      present.push(varName);
      const masked = varName.includes('KEY') || varName.includes('TOKEN')
        ? value.substring(0, 8) + '...'
        : value.substring(0, 20) + (value.length > 20 ? '...' : '');
      console.log(`✓ ${varName}: ${masked}`);
    }
  }

  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    if (value) {
      optional.push(varName);
      const masked = value.substring(0, 20) + (value.length > 20 ? '...' : '');
      console.log(`ℹ ${varName}: ${masked}`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`   Required: ${present.length}/${required.length} set`);
  if (optional.length > 0) {
    console.log(`   Optional: ${optional.length}/${OPTIONAL_VARS.length} set`);
  }

  if (missing.length > 0) {
    console.log(`\n❌ VALIDATION FAILED - Missing ${missing.length} required variables:`);
    missing.forEach(v => console.log(`   - ${v}`));
    return false;
  }

  console.log(`\n✅ ALL REQUIRED VARIABLES SET\n`);
  return true;
}

const env = process.argv[2] || 'staging';
const valid = validateEnv(env);
process.exit(valid ? 0 : 1);
