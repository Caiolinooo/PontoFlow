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

async function checkManagerGroups() {
  console.log('\n🔍 Verificando grupos da Karla Ramos...\n');

  // 1. Find Karla's user ID
  const { data: karlaUser, error: userError } = await supabase
    .from('users_unified')
    .select('id, email, role, tenant_id')
    .eq('email', 'karla.ramos@groupabz.com')
    .single();

  if (userError || !karlaUser) {
    console.error('❌ Erro ao buscar usuário Karla:', userError);
    return;
  }

  console.log('✅ Usuário encontrado:');
  console.log('   ID:', karlaUser.id);
  console.log('   Email:', karlaUser.email);
  console.log('   Role:', karlaUser.role);
  console.log('   Tenant ID:', karlaUser.tenant_id);
  console.log('');

  // 2. Check manager_group_assignments
  const { data: managerGroups, error: groupsError } = await supabase
    .from('manager_group_assignments')
    .select('*')
    .eq('manager_id', karlaUser.id)
    .eq('tenant_id', karlaUser.tenant_id);

  if (groupsError) {
    console.error('❌ Erro ao buscar grupos do manager:', groupsError);
    return;
  }

  console.log('📊 Grupos atribuídos ao manager:');
  if (!managerGroups || managerGroups.length === 0) {
    console.log('   ⚠️  NENHUM GRUPO ATRIBUÍDO');
    console.log('   Isso explica por que os relatórios estão vazios!');
    console.log('');
    
    // List available groups in the tenant
    const { data: availableGroups, error: availError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('tenant_id', karlaUser.tenant_id);

    if (availError) {
      console.error('❌ Erro ao buscar grupos disponíveis:', availError);
      return;
    }

    console.log('📋 Grupos disponíveis no tenant:');
    if (!availableGroups || availableGroups.length === 0) {
      console.log('   ⚠️  Nenhum grupo existe no tenant');
    } else {
      availableGroups.forEach((group, index) => {
        console.log(`   ${index + 1}. ${group.name} (ID: ${group.id})`);
      });
    }
    console.log('');
    console.log('💡 Solução: Atribuir grupos ao manager Karla usando a tabela manager_group_assignments');
    console.log('');
  } else {
    console.log(`   ✅ ${managerGroups.length} grupo(s) atribuído(s):`);
    for (const assignment of managerGroups) {
      console.log(`   - Group ID: ${assignment.group_id}`);
      
      // Get group details
      const { data: groupDetails } = await supabase
        .from('groups')
        .select('name')
        .eq('id', assignment.group_id)
        .single();

      if (groupDetails) {
        console.log(`     Nome: ${groupDetails.name}`);
      }

      // Get employees in this group
      const { data: members } = await supabase
        .from('employee_group_members')
        .select('employee_id')
        .eq('group_id', assignment.group_id)
        .eq('tenant_id', karlaUser.tenant_id);

      if (members && members.length > 0) {
        console.log(`     Colaboradores: ${members.length}`);
        
        // Get employee names
        const employeeIds = members.map(m => m.employee_id);
        const { data: employees } = await supabase
          .from('employees')
          .select('id, name')
          .in('id', employeeIds);

        if (employees) {
          employees.forEach(emp => {
            console.log(`       - ${emp.name} (${emp.id})`);
          });
        }
      } else {
        console.log(`     ⚠️  Nenhum colaborador neste grupo`);
      }
      console.log('');
    }
  }
}

checkManagerGroups().catch(console.error);

