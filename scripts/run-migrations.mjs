#!/usr/bin/env node

/**
 * Migration Runner for PontoFlow
 * 
 * Executes SQL migrations safely using Supabase Management API
 * Uses IF NOT EXISTS clauses to avoid conflicts with other projects
 * 
 * Usage:
 *   node scripts/run-migrations.mjs [migration-file]
 *   node scripts/run-migrations.mjs phase-20-environment-entries.sql
 *   node scripts/run-migrations.mjs all  # Run all pending migrations
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from web/.env.local
const envPath = join(__dirname, '../web/.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim().replace(/^["']|["']$/g, '');
    env[key] = value;
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !PROJECT_REF) {
  console.error('❌ Missing Supabase configuration in web/.env.local');
  process.exit(1);
}

console.log('🔧 PontoFlow Migration Runner');
console.log('📦 Project:', PROJECT_REF);
console.log('🌐 URL:', SUPABASE_URL);
console.log('');

/**
 * Execute SQL query using Supabase REST API (PostgREST)
 */
async function executeSQL(sql, description) {
  console.log(`⏳ Executing: ${description}...`);

  try {
    // Use the RPC endpoint to execute raw SQL
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/exec_sql`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log(`✅ Success: ${description}`);
    return result;
  } catch (error) {
    console.error(`❌ Error: ${description}`);
    console.error(`   ${error.message}`);
    throw error;
  }
}

/**
 * Check if a migration has already been executed
 */
async function isMigrationExecuted(migrationName) {
  try {
    // First, ensure the migrations table exists
    await executeSQL(
      `
      create table if not exists public._migrations (
        id serial primary key,
        name text unique not null,
        executed_at timestamptz not null default now()
      );
      `,
      'Ensure migrations table exists'
    );

    // Check if this migration has been executed
    const result = await executeSQL(
      `select exists(select 1 from public._migrations where name = '${migrationName}') as executed;`,
      `Check if ${migrationName} was executed`
    );

    return result[0]?.executed || false;
  } catch (error) {
    console.warn(`⚠️  Could not check migration status: ${error.message}`);
    return false;
  }
}

/**
 * Mark a migration as executed
 */
async function markMigrationExecuted(migrationName) {
  try {
    await executeSQL(
      `insert into public._migrations (name) values ('${migrationName}') on conflict (name) do nothing;`,
      `Mark ${migrationName} as executed`
    );
  } catch (error) {
    console.warn(`⚠️  Could not mark migration as executed: ${error.message}`);
  }
}

/**
 * Run a single migration file
 */
async function runMigration(filename) {
  const migrationPath = join(__dirname, '../docs/migrations', filename);
  
  console.log('');
  console.log('═'.repeat(60));
  console.log(`📄 Migration: ${filename}`);
  console.log('═'.repeat(60));

  // Check if already executed
  const executed = await isMigrationExecuted(filename);
  if (executed) {
    console.log('⏭️  Migration already executed, skipping...');
    return { skipped: true };
  }

  try {
    const sql = readFileSync(migrationPath, 'utf-8');
    
    // Split SQL into statements (simple split by semicolon)
    // This is a basic approach - for complex migrations, use a proper SQL parser
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements`);
    console.log('');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const description = `Statement ${i + 1}/${statements.length}`;
      
      try {
        await executeSQL(statement + ';', description);
      } catch (error) {
        // If error is about object already existing, it's safe to continue
        if (
          error.message.includes('already exists') ||
          error.message.includes('duplicate')
        ) {
          console.log(`⚠️  Object already exists, continuing...`);
        } else {
          throw error;
        }
      }
    }

    // Mark as executed
    await markMigrationExecuted(filename);

    console.log('');
    console.log(`✅ Migration ${filename} completed successfully!`);
    return { success: true };
  } catch (error) {
    console.error('');
    console.error(`❌ Migration ${filename} failed!`);
    console.error(`   ${error.message}`);
    return { error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const migrationsDir = join(__dirname, '../docs/migrations');

  if (args.length === 0 || args[0] === 'all') {
    // Run all migrations
    console.log('🚀 Running all pending migrations...');
    console.log('');

    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`📋 Found ${files.length} migration files`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      const result = await runMigration(file);
      if (result.success) successCount++;
      if (result.skipped) skipCount++;
      if (result.error) errorCount++;
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('📊 Migration Summary');
    console.log('═'.repeat(60));
    console.log(`✅ Successful: ${successCount}`);
    console.log(`⏭️  Skipped: ${skipCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    console.log('');

    if (errorCount > 0) {
      console.error('❌ Some migrations failed. Please check the errors above.');
      process.exit(1);
    } else {
      console.log('✅ All migrations completed successfully!');
    }
  } else {
    // Run specific migration
    const filename = args[0];
    await runMigration(filename);
  }
}

main().catch(error => {
  console.error('');
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

