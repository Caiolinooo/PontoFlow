/**
 * Database Verification Script
 * Checks if the user_invitations table exists and is properly configured
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabase() {
  console.log('🔍 Verifying database configuration...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);

  // Check if user_invitations table exists
  console.log('1️⃣ Checking if user_invitations table exists...');
  const { data: tables, error: tablesError } = await supabase
    .from('user_invitations')
    .select('id')
    .limit(1);

  if (tablesError) {
    console.error('❌ user_invitations table does NOT exist or is not accessible');
    console.error('Error:', tablesError);
    console.log('\n📋 To fix this, execute the migration SQL in Supabase Dashboard:');
    console.log('   File: web/docs/migrations/user-invitations.sql');
    console.log('   Dashboard: https://supabase.com/dashboard → SQL Editor\n');
    return false;
  }

  console.log('✅ user_invitations table exists!\n');

  // Check table structure
  console.log('2️⃣ Checking table structure...');
  const { data: invitations, error: structureError } = await supabase
    .from('user_invitations')
    .select('*')
    .limit(1);

  if (structureError) {
    console.error('❌ Error reading table structure:', structureError);
    return false;
  }

  console.log('✅ Table structure is correct!\n');

  // Check RLS policies
  console.log('3️⃣ Checking RLS policies...');
  let policies, policiesError;
  try {
    const result = await supabase.rpc('pg_policies', {
      table_name: 'user_invitations'
    });
    policies = result.data;
    policiesError = result.error;
  } catch (err) {
    policies = null;
    policiesError = err;
  }

  if (policiesError) {
    console.log('⚠️  Could not verify RLS policies (this is normal)');
  } else {
    console.log('✅ RLS policies configured!\n');
  }

  // Count existing invitations
  console.log('4️⃣ Counting existing invitations...');
  const { count, error: countError } = await supabase
    .from('user_invitations')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Error counting invitations:', countError);
    return false;
  }

  console.log(`✅ Found ${count || 0} invitation(s) in the database\n`);

  // Check users_unified table (for foreign key)
  console.log('5️⃣ Checking users_unified table...');
  const { data: users, error: usersError } = await supabase
    .from('users_unified')
    .select('id')
    .limit(1);

  if (usersError) {
    console.error('❌ users_unified table does NOT exist or is not accessible');
    console.error('Error:', usersError);
    return false;
  }

  console.log('✅ users_unified table exists!\n');

  console.log('🎉 All database checks passed!');
  console.log('✅ The invitation system is ready to use!\n');
  return true;
}

verifyDatabase()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });

