#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env.local
const envContent = readFileSync('.env.local', 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      envVars[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

console.log('🔍 Verificando tenants e usuários...\n');

// Check tenants
const { data: tenants, error: tenantsError } = await supabase
  .from('tenants')
  .select('id, name, created_at');

if (tenantsError) {
  console.error('❌ Erro ao buscar tenants:', tenantsError.message);
} else {
  console.log(`✅ Total de tenants: ${tenants.length}`);
  tenants.forEach(t => console.log(`   - ${t.name} (ID: ${t.id})`));
}

// Check user role
const { data: userRoles, error: rolesError } = await supabase
  .from('tenant_user_roles')
  .select('user_id, tenant_id, role')
  .eq('user_id', 'e7edafc8-f993-400b-ada9-4eeea17ee9cc');

if (rolesError) {
  console.error('❌ Erro ao buscar roles do usuário:', rolesError.message);
} else {
  console.log(`\n✅ Roles do usuário (caio.correia@groupabz.com):`);
  if (userRoles.length === 0) {
    console.log('   ❌ Nenhum role encontrado - ÉSEMBORA O PROBLEMA!');
  } else {
    userRoles.forEach(r => console.log(`   - Tenant: ${r.tenant_id}, Role: ${r.role}`));
  }
}

// Check if user has employee record
const { data: employee, error: employeeError } = await supabase
  .from('employees')
  .select('id, tenant_id, profile_id')
  .eq('profile_id', 'e7edafc8-f993-400b-ada9-4eeea17ee9cc');

if (employeeError) {
  console.error('❌ Erro ao buscar funcionário:', employeeError.message);
} else {
  console.log(`\n✅ Record de funcionário:`);
  if (employee.length === 0) {
    console.log('   ❌ Nenhum record encontrado');
  } else {
    employee.forEach(e => console.log(`   - ID: ${e.id}, Tenant: ${e.tenant_id}`));
  }
}
