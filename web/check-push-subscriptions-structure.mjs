import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando estrutura da tabela push_subscriptions...\n');

// Try to get one row to see the columns
const { data, error } = await supabase
  .from('push_subscriptions')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ Erro ao buscar push_subscriptions:', error.message);
  console.log('Código:', error.code);
  console.log('Detalhes:', error.details);
} else {
  if (data && data.length > 0) {
    console.log('✅ Colunas encontradas:', Object.keys(data[0]));
    console.log('\n📄 Exemplo de registro:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('⚠️  Tabela existe mas está vazia');
    console.log('Tentando inserir um registro de teste...');
    
    const { data: insertData, error: insertError } = await supabase
      .from('push_subscriptions')
      .insert([{
        user_id: 'test-user-id',
        endpoint: 'https://test.endpoint.com',
        auth: 'test-auth',
        p256dh: 'test-p256dh'
      }])
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir:', insertError.message);
      console.log('Código:', insertError.code);
      console.log('Detalhes:', insertError.details);
    } else {
      console.log('✅ Registro inserido:', insertData);
      console.log('✅ Colunas:', Object.keys(insertData[0]));
    }
  }
}

