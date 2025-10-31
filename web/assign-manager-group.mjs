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

async function assignManagerGroup() {
  console.log('\n🔧 Atribuindo grupo "ABZ Base" à Karla Ramos...\n');

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
  console.log('   ID:', karlaUser.id);
  console.log('   Tenant ID:', karlaUser.tenant_id);
  console.log('');

  // 2. Find ABZ Base group
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('id, name')
    .eq('name', 'ABZ Base')
    .eq('tenant_id', karlaUser.tenant_id)
    .single();

  if (groupError || !group) {
    console.error('❌ Erro ao buscar grupo ABZ Base:', groupError);
    return;
  }

  console.log('✅ Grupo encontrado:', group.name);
  console.log('   ID:', group.id);
  console.log('');

  // 3. Check if assignment already exists
  const { data: existing, error: existingError } = await supabase
    .from('manager_group_assignments')
    .select('*')
    .eq('manager_id', karlaUser.id)
    .eq('group_id', group.id)
    .eq('tenant_id', karlaUser.tenant_id)
    .maybeSingle();

  if (existingError) {
    console.error('❌ Erro ao verificar atribuição existente:', existingError);
    return;
  }

  if (existing) {
    console.log('ℹ️  Atribuição já existe!');
    console.log('   Assignment ID:', existing.id);
    console.log('');
    return;
  }

  // 4. Create assignment
  const { data: assignment, error: assignError } = await supabase
    .from('manager_group_assignments')
    .insert({
      tenant_id: karlaUser.tenant_id,
      manager_id: karlaUser.id,
      group_id: group.id
    })
    .select()
    .single();

  if (assignError) {
    console.error('❌ Erro ao criar atribuição:', assignError);
    return;
  }

  console.log('✅ Atribuição criada com sucesso!');
  console.log('   Assignment ID:', assignment.id);
  console.log('   Manager:', karlaUser.email);
  console.log('   Grupo:', group.name);
  console.log('');

  // 5. Verify employees in the group
  const { data: members, error: membersError } = await supabase
    .from('employee_group_members')
    .select('employee_id')
    .eq('group_id', group.id)
    .eq('tenant_id', karlaUser.tenant_id);

  if (membersError) {
    console.error('❌ Erro ao buscar membros do grupo:', membersError);
    return;
  }

  if (!members || members.length === 0) {
    console.log('⚠️  O grupo "ABZ Base" não tem colaboradores atribuídos');
    console.log('   Karla não verá nenhum relatório até que colaboradores sejam adicionados ao grupo');
    console.log('');
  } else {
    console.log(`✅ O grupo "ABZ Base" tem ${members.length} colaborador(es)`);
    
    // Get employee names
    const employeeIds = members.map(m => m.employee_id);
    const { data: employees } = await supabase
      .from('employees')
      .select('id, name')
      .in('id', employeeIds);

    if (employees) {
      console.log('   Colaboradores que Karla poderá gerenciar:');
      employees.forEach((emp, index) => {
        console.log(`   ${index + 1}. ${emp.name} (${emp.id})`);
      });
    }
    console.log('');
  }

  console.log('🎉 Concluído! Karla agora pode ver relatórios dos colaboradores do grupo "ABZ Base"');
  console.log('');
}

assignManagerGroup().catch(console.error);

