import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkFolgaTipo() {
  console.log('🔍 Checking tipo for Folga entries on 2025-10-30...\n');

  // Get all Folga environments
  const { data: folgaEnvs, error: envError } = await supabase
    .from('environments')
    .select('*')
    .eq('slug', 'folga');

  if (envError || !folgaEnvs || folgaEnvs.length === 0) {
    console.error('❌ Folga environment not found:', envError);
    return;
  }

  console.log(`✅ Found ${folgaEnvs.length} Folga environment(s):\n`);
  folgaEnvs.forEach((env, index) => {
    console.log(`Environment ${index + 1}:`);
    console.log('   ID:', env.id);
    console.log('   Slug:', env.slug);
    console.log('   Name:', env.name);
    console.log('   Tenant ID:', env.tenant_id);
    console.log('');
  });

  const folgaEnvIds = folgaEnvs.map(e => e.id);

  // Get entries for 2025-10-30 with Folga environment
  const { data: entries, error: entriesError } = await supabase
    .from('timesheet_entries')
    .select('*')
    .eq('data', '2025-10-30')
    .in('environment_id', folgaEnvIds);

  if (entriesError) {
    console.error('❌ Error fetching entries:', entriesError);
    return;
  }

  console.log(`📊 Found ${entries.length} Folga entries on 2025-10-30:\n`);

  entries.forEach((entry, index) => {
    console.log(`Entry ${index + 1}:`);
    console.log('  ID:', entry.id);
    console.log('  Data:', entry.data);
    console.log('  Tipo:', entry.tipo);
    console.log('  Environment ID:', entry.environment_id);
    console.log('  Hora Ini:', entry.hora_ini);
    console.log('  Hora Fim:', entry.hora_fim);
    console.log('  Observacao:', entry.observacao);
    console.log('');
  });

  // Check if tipo is 'folga' or 'ferias'
  const folgaTipos = entries.filter(e => e.tipo === 'folga');
  const feriasTipos = entries.filter(e => e.tipo === 'ferias');

  console.log('📈 Summary:');
  console.log(`  Entries with tipo='folga': ${folgaTipos.length}`);
  console.log(`  Entries with tipo='ferias': ${feriasTipos.length}`);
  console.log('');

  if (feriasTipos.length > 0) {
    console.log('❌ PROBLEM: Some entries have tipo="ferias" instead of "folga"');
    console.log('   This means the mapping is still incorrect.');
  } else if (folgaTipos.length > 0) {
    console.log('✅ SUCCESS: All entries have tipo="folga" as expected!');
  } else {
    console.log('⚠️  WARNING: No entries found with tipo="folga" or "ferias"');
  }
}

checkFolgaTipo().catch(console.error);

