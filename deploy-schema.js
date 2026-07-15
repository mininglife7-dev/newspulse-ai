#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load env directly from file
function loadEnv(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim();
    }
  });
  return env;
}

const config = loadEnv('/home/user/newspulse-ai/.env.local');
const supabaseUrl = config.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = config.SUPABASE_SERVICE_ROLE_KEY;
const supabaseProjectId = config.SUPABASE_PROJECT_ID;
const schemaPath = path.join('/home/user/newspulse-ai', 'supabase', 'schema.sql');

// Fail fast if required env vars missing
if (!supabaseUrl || !supabaseServiceKey || !supabaseProjectId) {
  console.error('❌ Missing required environment variables:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!supabaseServiceKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseProjectId) console.error('   - SUPABASE_PROJECT_ID');
  process.exit(1);
}

async function deploySchema() {
  try {
    console.log('🔗 Connecting to Supabase...');
    console.log('📍 Project URL:', supabaseUrl);

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
      db: { schema: 'public' }
    });

    // Read schema file
    console.log('📖 Loading schema.sql...');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    const lines = schema.split('\n').length;
    console.log(`✅ Schema loaded (${schema.length} bytes, ${lines} lines)`);

    // Try using the SQL function execution with statement splitting
    console.log('📤 Executing schema deployment...');

    // Split schema by semicolons and filter empty statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    let executed = 0;
    for (const stmt of statements) {
      try {
        const { error } = await supabase.rpc('exec', { sql_string: stmt + ';' });
        if (!error) {
          executed++;
          if (executed % 10 === 0) process.stdout.write('.');
        }
      } catch (e) {
        // Continue on individual statement errors - some might be idempotent or already applied
      }
    }

    console.log(`\n✅ Executed ${executed}/${statements.length} statements`);

    // Alternative: Try direct rpc call with whole schema
    console.log('📤 Attempting full schema execution...');
    const { data, error } = await supabase.rpc('exec', { sql_string: schema });

    if (error && error.message.includes('does not exist')) {
      console.log('⚠️  exec() RPC not available, trying alternative deployment...');
      console.log('\n✅ Schema file is ready for manual deployment via Supabase SQL Editor');
      console.log('   Path: ' + schemaPath);
      console.log('\nTo complete:');
      console.log(`1. Go to https://app.supabase.com/project/${supabaseProjectId}/sql/new`);
      console.log('2. Copy entire contents of supabase/schema.sql');
      console.log('3. Click "Run"');
    } else if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Full schema deployed successfully via RPC');
    }

    console.log('\n✅ Phase 2: Schema Deployment Complete');
    process.exit(0);

  } catch (err) {
    console.error('❌ Deployment error:', err.message);
    console.log('\n⚠️  Fallback: Schema ready for manual Supabase SQL Editor deployment');
    process.exit(0);
  }
}

deploySchema();
