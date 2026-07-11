#!/usr/bin/env node

/**
 * Supabase Schema Deployment Script
 * Deploys incident response tables to Supabase production
 *
 * Prerequisites:
 * - SUPABASE_DB_URL environment variable set
 * - psql client installed and in PATH
 *
 * Usage: node scripts/deploy-supabase-schema.mjs [--dry-run]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCHEMA_FILE = 'supabase/migrations/schema.sql';
const DRY_RUN = process.argv.includes('--dry-run');

function verifyPrerequisites() {
  console.log('\n🔍 Verifying prerequisites...\n');

  // Check psql
  try {
    execSync('which psql', { stdio: 'pipe' });
    console.log('✓ psql client available');
  } catch {
    console.error('❌ psql client not found. Install PostgreSQL client tools.');
    return false;
  }

  // Check schema file
  if (!fs.existsSync(SCHEMA_FILE)) {
    console.error(`❌ Schema file not found: ${SCHEMA_FILE}`);
    return false;
  }
  console.log(`✓ Schema file found: ${SCHEMA_FILE}`);

  // Check environment
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    console.error('❌ SUPABASE_DB_URL environment variable not set');
    return false;
  }
  console.log('✓ SUPABASE_DB_URL configured');

  return true;
}

function readSchema() {
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf-8');
  const tableMatches = schema.match(/CREATE TABLE.*?;/gs) || [];
  console.log(`\n📊 Schema contains ${tableMatches.length} table definitions`);
  tableMatches.forEach((match) => {
    const tableName = match.match(/CREATE TABLE .*?"?(\w+)"?/)?.[1];
    if (tableName) {
      console.log(`   - ${tableName}`);
    }
  });
  return schema;
}

function deploySchema(schema) {
  const dbUrl = process.env.SUPABASE_DB_URL;

  if (DRY_RUN) {
    console.log('\n🔄 DRY RUN MODE - No changes will be applied\n');
    console.log('Schema that would be applied:');
    console.log('─'.repeat(80));
    console.log(schema.substring(0, 500) + (schema.length > 500 ? '\n...(truncated)' : ''));
    console.log('─'.repeat(80));
    console.log('\n✅ Dry run complete. No changes applied.\n');
    return true;
  }

  console.log('\n⚡ Deploying schema to production...\n');

  try {
    // Create temporary file with schema
    const tmpFile = '/tmp/schema-deploy.sql';
    fs.writeFileSync(tmpFile, schema);

    // Execute schema deployment
    execSync(`psql "${dbUrl}" < "${tmpFile}"`, {
      stdio: 'inherit',
      env: { ...process.env },
    });

    // Clean up
    fs.unlinkSync(tmpFile);

    console.log('\n✅ Schema deployed successfully\n');
    return true;
  } catch (error) {
    console.error('\n❌ Schema deployment failed:', error.message, '\n');
    return false;
  }
}

function verifyDeployment() {
  console.log('🔐 Verifying deployment...\n');

  const dbUrl = process.env.SUPABASE_DB_URL;
  const tables = [
    'incidents',
    'error_patterns',
    'orchestrations',
    'alerts',
    'post_mortems',
    'prevention_measures',
  ];

  try {
    for (const table of tables) {
      const result = execSync(
        `psql "${dbUrl}" -tc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}');"`,
        { encoding: 'utf-8' }
      ).trim();

      if (result === 't') {
        console.log(`✓ Table '${table}' exists`);
      } else {
        console.log(`❌ Table '${table}' not found`);
        return false;
      }
    }

    console.log('\n✅ All tables verified\n');
    return true;
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('═'.repeat(80));
  console.log('SUPABASE SCHEMA DEPLOYMENT');
  console.log('═'.repeat(80));

  if (!verifyPrerequisites()) {
    process.exit(1);
  }

  const schema = readSchema();

  if (!deploySchema(schema)) {
    process.exit(1);
  }

  if (!DRY_RUN && !verifyDeployment()) {
    process.exit(1);
  }

  console.log('═'.repeat(80));
  console.log('✅ DEPLOYMENT COMPLETE');
  console.log('═'.repeat(80));
  console.log('\nNext steps:');
  console.log('1. Verify incident response system in staging');
  console.log('2. Run war games validation');
  console.log('3. Deploy to production');
  console.log('');
}

main();
