#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
try {
  const envContent = readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
} catch (err) {
  console.log('Note: Could not load .env.local, using system environment variables');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTenantTable() {
  console.log('=== Checking tenants table structure ===\n');
  
  try {
    // Use raw SQL query to get table structure
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('*')
      .eq('table_name', 'tenants')
      .eq('table_schema', 'public');
      
    if (tableError) {
      console.error('Error querying information_schema:', tableError);
      return;
    }
    
    console.log('Current tenants table structure:');
    tables.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'} ${col.column_default ? `DEFAULT ${col.column_default}` : ''}`);
    });
    
    const hasTimezone = tables.some(col => col.column_name === 'timezone');
    const hasWorkMode = tables.some(col => col.column_name === 'work_mode');
    const hasDeadlineDay = tables.some(col => col.column_name === 'deadline_day');
    
    console.log(`\nColumn status:`);
    console.log(`timezone: ${hasTimezone ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`work_mode: ${hasWorkMode ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`deadline_day: ${hasDeadlineDay ? '✅ EXISTS' : '❌ MISSING'}`);
    
    return { hasTimezone, hasWorkMode, hasDeadlineDay, columns: tables };
    
  } catch (err) {
    console.error('Failed to check table structure:', err);
    return null;
  }
}

async function getCurrentTenants() {
  console.log('\n=== Getting current tenants ===\n');
  
  try {
    const { data: tenants, error } = await supabase
      .from('tenants')
      .select('id, name, timezone, work_mode, deadline_day')
      .limit(5);
      
    if (error) {
      console.error('Error fetching tenants:', error);
      return [];
    }
    
    console.log('Sample tenants:');
    tenants.forEach(tenant => {
      console.log(`- ${tenant.name} (${tenant.id})`);
      console.log(`  timezone: ${tenant.timezone || 'NULL'}`);
      console.log(`  work_mode: ${tenant.work_mode || 'NULL'}`);
      console.log(`  deadline_day: ${tenant.deadline_day || 'NULL'}`);
    });
    
    return tenants;
    
  } catch (err) {
    console.error('Failed to fetch tenants:', err);
    return [];
  }
}

// Since we can't execute arbitrary SQL, we'll use Supabase's REST API to update the table
async function addMissingColumns() {
  console.log('\n=== Attempting to add missing columns via Supabase API ===\n');
  
  // Note: In a real production environment, this would need to be done via Supabase dashboard
  // or a direct database connection. For now, we'll document what needs to be done.
  
  const requiredSQL = `
    -- Phase 23: Add missing tenant configuration columns
    
    -- Add timezone column
    ALTER TABLE public.tenants 
    ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';
    
    -- Add work_mode column  
    ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50) DEFAULT 'padrao';
    
    -- Add deadline_day column
    ALTER TABLE public.tenants
    ADD COLUMN IF NOT EXISTS deadline_day INTEGER DEFAULT 16;
    
    -- Add comments for documentation
    COMMENT ON COLUMN public.tenants.timezone IS 'Tenant timezone for date calculations (e.g., America/Sao_Paulo, America/New_York, Europe/London)';
    COMMENT ON COLUMN public.tenants.work_mode IS 'Tenant work mode configuration (e.g., padrao, flexible)';
    COMMENT ON COLUMN public.tenants.deadline_day IS 'Deadline day for timesheet submission (1-28, default: 16)';
    
    -- Update existing tenants
    UPDATE public.tenants 
    SET 
      timezone = COALESCE(timezone, 'America/Sao_Paulo'),
      work_mode = COALESCE(work_mode, 'padrao'), 
      deadline_day = COALESCE(deadline_day, 16)
    WHERE 
      timezone IS NULL OR 
      work_mode IS NULL OR 
      deadline_day IS NULL;
  `;
  
  console.log('The following SQL needs to be executed in Supabase SQL Editor:');
  console.log('='.repeat(60));
  console.log(requiredSQL);
  console.log('='.repeat(60));
  
  return { success: false, sql: requiredSQL };
}

async function main() {
  console.log('🔧 CRITICAL DATABASE SCHEMA FIX - TENANT TIMEZONE SUPPORT\n');
  
  const currentStructure = await checkTenantTable();
  const currentTenants = await getCurrentTenants();
  const migrationSQL = await addMissingColumns();
  
  console.log('\n=== SUMMARY ===');
  console.log(`Current tenants: ${currentTenants.length} tenants loaded`);
  console.log(`Missing columns: timezone, work_mode, deadline_day`);
  console.log('Action required: Execute provided SQL in Supabase dashboard');
  
  // Generate the exact SQL commands needed
  console.log('\n=== EXECUTE THIS IN SUPABASE SQL EDITOR ===');
  console.log(`
-- 1. Add the missing columns
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS work_mode VARCHAR(50) DEFAULT 'padrao';

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS deadline_day INTEGER DEFAULT 16;

-- 2. Update existing tenants with default values
UPDATE public.tenants 
SET 
  timezone = COALESCE(timezone, 'America/Sao_Paulo'),
  work_mode = COALESCE(work_mode, 'padrao'), 
  deadline_day = COALESCE(deadline_day, 16)
WHERE 
  timezone IS NULL OR 
  work_mode IS NULL OR 
  deadline_day IS NULL;

-- 3. Verify the changes
SELECT id, name, timezone, work_mode, deadline_day 
FROM public.tenants 
LIMIT 5;
  `);
}

main().catch(console.error);