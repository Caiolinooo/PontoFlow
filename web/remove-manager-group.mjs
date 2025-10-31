import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function removeManagerGroup() {
  console.log('\n🗑️  Removendo atribuição de grupo da Karla Ramos...\n');

  // 1. Find Karla's user ID
  const { data: karlaUser, error: userError } = await supabase
    .from('users_unified')
    .select('id, email, tenant_id')
    .eq('email', 'karla.ramos@groupabz.com')
    .single();

  if (userError || !karlaUser) {
    console.error('❌ Erro ao buscar usuário Karla:', userError);
    return;
  }

  console.log('✅ Usuário encontrado:', karlaUser.email);
  console.log('');

  // 2. Delete all manager group assignments
  const { error: deleteError } = await supabase
    .from('manager_group_assignments')
    .delete()
    .eq('manager_id', karlaUser.id)
    .eq('tenant_id', karlaUser.tenant_id);

  if (deleteError) {
    console.error('❌ Erro ao remover atribuições:', deleteError);
    return;
  }

  console.log('✅ Atribuições de grupo removidas com sucesso!');
  console.log('   Karla agora poderá gerar apenas o próprio relatório');
  console.log('');
}

removeManagerGroup().catch(console.error);

