import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando tabela push_subscriptions...\n');

// Check if table exists
const { data, error } = await supabase
  .from('push_subscriptions')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ Tabela push_subscriptions NÃO EXISTE');
  console.log('Erro:', error.message);
  console.log('\n📝 A tabela precisa ser criada no banco de dados.');
} else {
  console.log('✅ Tabela push_subscriptions existe!');
  console.log('Dados:', data);
}

