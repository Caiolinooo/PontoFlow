import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('🔍 Verificando estrutura da tabela notifications...\n');

// Try to get one row to see the columns
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .limit(1);

if (error) {
  console.log('❌ Erro ao buscar notifications:', error.message);
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
      .from('notifications')
      .insert([{
        user_id: 'test-user-id',
        type: 'info',
        title: 'Test',
        message: 'Test message'
      }])
      .select();
    
    if (insertError) {
      console.log('❌ Erro ao inserir:', insertError.message);
      console.log('Código:', insertError.code);
      console.log('Detalhes:', insertError.details);
    } else {
      console.log('✅ Registro inserido:', insertData);
    }
  }
}

// Check if table exists
const { data: tables, error: tablesError } = await supabase
  .from('notifications')
  .select('id')
  .limit(0);

if (tablesError && tablesError.code === '42P01') {
  console.log('\n❌ TABELA NOTIFICATIONS NÃO EXISTE!');
  console.log('É necessário criar a tabela no banco de dados.');
}

