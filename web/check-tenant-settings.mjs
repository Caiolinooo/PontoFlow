import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const TENANT_ID = '2376edb6-bcda-47f6-a0c7-cecd701298ca'; // ABZ Group

console.log('🔍 Verificando configurações do tenant...\n');

// Check tenant table
const { data: tenant, error: tenantError } = await supabase
  .from('tenants')
  .select('*')
  .eq('id', TENANT_ID)
  .single();

if (tenantError) {
  console.log('❌ Erro ao buscar tenant:', tenantError.message);
} else {
  console.log('✅ Tenant encontrado:');
  console.log('   - ID:', tenant.id);
  console.log('   - Nome:', tenant.name);
  console.log('   - Slug:', tenant.slug);
  console.log('   - Timezone:', tenant.timezone);
  console.log('   - Work Mode:', tenant.work_mode);
  console.log('   - Deadline Day:', tenant.deadline_day);
  console.log('');
}

// Check tenant_settings table
const { data: settings, error: settingsError } = await supabase
  .from('tenant_settings')
  .select('*')
  .eq('tenant_id', TENANT_ID)
  .maybeSingle();

if (settingsError) {
  console.log('❌ Erro ao buscar tenant_settings:', settingsError.message);
} else if (!settings) {
  console.log('⚠️  Nenhuma configuração encontrada em tenant_settings');
  console.log('   Criando registro padrão...\n');
  
  const { data: newSettings, error: createError } = await supabase
    .from('tenant_settings')
    .insert({
      tenant_id: TENANT_ID,
      company_name: 'ABZ Group',
      company_legal_name: 'ABZ Group Ltda',
      timezone: 'America/Sao_Paulo',
      deadline_day: 16,
    })
    .select()
    .single();
  
  if (createError) {
    console.log('❌ Erro ao criar configuração:', createError.message);
  } else {
    console.log('✅ Configuração criada com sucesso!');
    console.log(newSettings);
  }
} else {
  console.log('✅ Configurações encontradas:');
  console.log('   - Company Name:', settings.company_name);
  console.log('   - Legal Name:', settings.company_legal_name);
  console.log('   - Document:', settings.company_document);
  console.log('   - Email:', settings.email);
  console.log('   - Website:', settings.website);
  console.log('   - Logo URL:', settings.logo_url);
  console.log('   - Address Line 1:', settings.address_line1);
  console.log('   - City:', settings.city);
  console.log('   - State:', settings.state);
  console.log('   - Postal Code:', settings.postal_code);
  console.log('   - Country:', settings.country);
  console.log('   - Timezone:', settings.timezone);
  console.log('   - Deadline Day:', settings.deadline_day);
  console.log('');
}

