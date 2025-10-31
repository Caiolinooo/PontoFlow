#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables
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

async function fixTenantAssignment() {
  console.log('🔧 Corrigindo tenant assignment para caio.correia@groupabz.com...\n');

  try {
    // First, check existing tenants
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name')
      .limit(5);

    if (tenantsError) throw tenantsError;

    if (tenants.length === 0) {
      console.log('❌ Nenhum tenant encontrado na base de dados');
      return;
    }

    console.log('📋 Tenants disponíveis:');
    tenants.forEach(t => console.log(`   - ${t.name} (ID: ${t.id})`));

    // Use the first tenant as the primary one
    const tenantId = tenants[0].id;
    console.log(`\n🎯 Usando tenant: ${tenants[0].name}\n`);

    // Check if user already has role
    const userId = 'e7edafc8-f993-400b-ada9-4eeea17ee9cc';
    const { data: existingRoles, error: rolesError } = await supabase
      .from('tenant_user_roles')
      .select('*')
      .eq('user_id', userId);

    if (rolesError) throw rolesError;

    if (existingRoles.length > 0) {
      console.log('✅ Usuário já tem roles atribuídos:');
      existingRoles.forEach(r => console.log(`   - ${r.role} para tenant ${r.tenant_id}`));

      // Check if he has ADMIN role for the first tenant
      const hasAdminRole = existingRoles.some(r =>
        r.tenant_id === tenantId && r.role === 'TENANT_ADMIN'
      );

      if (hasAdminRole) {
        console.log('\n✅ User already has ADMIN role - should work now!');
        return;
      }
    }

    // Assign ADMIN role
    const { error: insertError } = await supabase
      .from('tenant_user_roles')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        role: 'TENANT_ADMIN'
      });

    if (insertError) {
      console.error('❌ Erro ao inserir role:', insertError.message);
      return;
    }

    console.log('✅ Role TENANT_ADMIN atribuído com sucesso!');

    // Skip employee creation for now - let's test if role alone works
    console.log('⏭️  Pulando criação de empregado - testando com role apenas');

    console.log('\n🎉 CORREÇÃO COMPLETA! Agora teste as funcionalidades.');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

fixTenantAssignment();
