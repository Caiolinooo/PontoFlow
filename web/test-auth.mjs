import { createClient } from '@supabase/supabase-js';

// Read .env.local file manually
import fs from 'fs';

function loadEnv() {
  const envPath = '.env.local';
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env.local file not found');
    process.exit(1);
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key] = valueParts.join('=');
      }
    }
  });
  
  return envVars;
}

// Load environment variables
const envVars = loadEnv();
const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env.local');
  console.error('Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAuth() {
  console.log('🔵 Testing Supabase Authentication...\n');
  console.log('🌐 Supabase URL:', supabaseUrl);
  console.log('');
  
  try {
    // Test credentials
    const email = 'caio.correia@groupabz.com';
    const password = 'Caio@2122@';
    
    console.log(`📧 Attempting to sign in with: ${email}\n`);
    
    // Try to sign in with credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });
    
    if (error) {
      console.error('❌ Authentication failed:', error.message);
      console.error('Error details:', error);
      return;
    }
    
    console.log('✅ Authentication successful!');
    console.log('User ID:', data.user?.id);
    console.log('User email:', data.user?.email);
    console.log('Session expires at:', data.session?.expires_at);
    
    // Now try to get user data with joins
    console.log('\n🔍 Fetching user profile data...');
    
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select(`
        id,
        email,
        raw_user_meta_data,
        profiles(
          display_name,
          first_name,
          last_name,
          phone_number,
          avatar_url,
          locale,
          tenant_id,
          tenant_user_roles(
            role,
            tenant_id
          ),
          employees(
            id,
            cargo,
            centro_custo,
            departamento,
            ativo
          )
        )
      `)
      .eq('id', data.user.id)
      .single();
    
    if (userError) {
      console.error('❌ Error fetching user data:', userError.message);
      console.error('Error details:', userError);
      return;
    }
    
    console.log('✅ User data fetched successfully:');
    console.log(JSON.stringify(userData, null, 2));
    
    const profile = userData.profiles;
    const tenantRole = profile?.tenant_user_roles?.[0];
    const employee = profile?.employees?.[0];
    
    console.log('\n📊 User Analysis:');
    console.log('- Role:', tenantRole?.role);
    console.log('- Employee Active:', employee?.ativo);
    console.log('- Tenant ID:', tenantRole?.tenant_id || profile?.tenant_id);
    
    // Check if user has access
    const allowedRoles = ['ADMIN', 'MANAGER_TIMESHEET', 'USER', 'MANAGER', 'TENANT_ADMIN', 'GERENTE', 'COLAB'];
    const userRole = tenantRole?.role || 'USER';
    
    console.log('\n🔐 Access Check:');
    console.log('- Allowed roles:', allowedRoles);
    console.log('- User role:', userRole);
    console.log('- Has access:', allowedRoles.includes(userRole));
    console.log('- Employee is active:', employee?.ativo !== false);
    
    if (!allowedRoles.includes(userRole)) {
      console.log('❌ User does not have permission to access system');
    }
    
    if (employee?.ativo === false) {
      console.log('❌ Employee account is inactive');
    }
    
    if (allowedRoles.includes(userRole) && employee?.ativo !== false) {
      console.log('✅ User should be able to access the system');
    }
    
  } catch (err) {
    console.error('💥 Unexpected error:', err);
  }
}

// Run the test
testAuth().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('💥 Test failed:', err);
  process.exit(1);
});