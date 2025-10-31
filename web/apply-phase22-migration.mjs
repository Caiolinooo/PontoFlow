#!/usr/bin/env node

/**
 * Script para aplicar a migration phase-22 que adiciona tenant_id 
 * às tabelas de delegação para melhor performance
 */

import { readFile } from 'fs/promises';
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não configuradas:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Configurado' : '❌ Faltando');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Configurado' : '❌ Faltando');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkMigrationApplied() {
  console.log('🔍 Verificando se migration phase-22 já foi aplicada...');
  
  try {
    // Verificar se coluna tenant_id existe em manager_group_assignments
    const { data: hasTenantIdColumn, error: columnError } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'manager_group_assignments')
      .eq('column_name', 'tenant_id')
      .maybeSingle();

    if (columnError) {
      console.error('❌ Erro ao verificar coluna tenant_id:', columnError);
      return false;
    }

    if (hasTenantIdColumn) {
      console.log('✅ Migration phase-22 já foi aplicada - coluna tenant_id existe');
      return true;
    } else {
      console.log('⚠️  Migration phase-22 ainda não foi aplicada');
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao verificar migration:', error);
    return false;
  }
}

async function applyMigration() {
  console.log('🚀 Aplicando migration phase-22...');

  try {
    // Ler o conteúdo do arquivo SQL
    const migrationSQL = await readFile('../docs/migrations/phase-22-add-tenant-to-delegations.sql', 'utf8');
    
    console.log('📄 Executando migration SQL...');
    
    // Executar a migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Erro ao executar migration:', error);
      return false;
    }

    console.log('✅ Migration phase-22 aplicada com sucesso!');
    return true;

  } catch (error) {
    console.error('❌ Erro ao aplicar migration:', error);
    return false;
  }
}

async function validateMigration() {
  console.log('🔍 Validando migration aplicada...');

  try {
    // Verificar se as colunas foram criadas
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('table_name, column_name, data_type, is_nullable')
      .in('table_name', ['manager_group_assignments', 'employee_group_members'])
      .eq('column_name', 'tenant_id');

    if (error) {
      console.error('❌ Erro ao validar colunas:', error);
      return false;
    }

    console.log('📋 Colunas encontradas:');
    columns?.forEach(col => {
      console.log(`   ${col.table_name}.${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(NULLABLE)'}`);
    });

    // Verificar índices
    const { data: indexes, error: indexError } = await supabase
      .from('pg_indexes')
      .select('indexname, tablename')
      .in('tablename', ['manager_group_assignments', 'employee_group_members'])
      .like('indexname', '%tenant%');

    if (indexError) {
      console.error('❌ Erro ao validar índices:', indexError);
      return false;
    }

    console.log('📋 Índices encontrados:');
    indexes?.forEach(idx => {
      console.log(`   ${idx.indexname} em ${idx.tablename}`);
    });

    return true;

  } catch (error) {
    console.error('❌ Erro ao validar migration:', error);
    return false;
  }
}

async function main() {
  console.log('🏗️  === MIGRATION PHASE-22 APPLIER ===\n');

  try {
    // Verificar se já foi aplicada
    const isApplied = await checkMigrationApplied();
    
    if (isApplied) {
      console.log('✅ Migration já aplicada - validando...');
      await validateMigration();
      return;
    }

    // Aplicar migration
    const success = await applyMigration();
    
    if (!success) {
      console.log('\n❌ Falha ao aplicar migration');
      console.log('\n📋 Próximos passos manuais:');
      console.log('1. Acesse o Supabase Dashboard');
      console.log('2. Vá para SQL Editor');
      console.log('3. Execute o conteúdo do arquivo: docs/migrations/phase-22-add-tenant-to-delegations.sql');
      process.exit(1);
    }

    // Validar
    await validateMigration();

    console.log('\n✅ Migration phase-22 aplicada com sucesso!');
    console.log('🔄 Reinicie o servidor de desenvolvimento para aplicar as mudanças.');

  } catch (error) {
    console.error('\n❌ Erro geral:', error);
    process.exit(1);
  }
}

// Executar script se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { checkMigrationApplied, applyMigration, validateMigration };
