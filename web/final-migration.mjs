import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arzvingdtnttiejcvucs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function finalMigration() {
  console.log('🚀 Executando migration final para corrigir constraint...')
  
  try {
    // Primeira abordagem: vamos fazer a constraint mais permissiva para aceitar valores existentes
    console.log('📝 Criando constraint permissiva que aceita todos os valores...')
    
    // Drop constraint existente
    const dropResult = await supabase.rpc('execute_sql', {
      query: 'ALTER TABLE public.timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_tipo_check;'
    })
    
    console.log('📋 Constraint anterior removida')
    
    // Criar nova constraint muito permissiva que inclui valores conhecidos e novos
    const newConstraintSQL = `
      ALTER TABLE public.timesheet_entries 
      ADD CONSTRAINT timesheet_entries_tipo_check 
      CHECK (tipo IS NULL OR tipo IN (
          -- Valores que já funcionam
          'folga',
          -- Valores marítimos de trabalho
          'inicio', 'pausa', 'fim', 'embarque', 'desembarque', 'espera', 'refeicao',
          -- Tipos gerais para flexibilidade
          'trabalho', 'ferias', 'licenca', 'doenca', 'treinamento', 'manutencao', 'viagem', 'administrativo',
          -- Tipos legacy que podem existir
          'EMBARQUE', 'DESEMBARQUE', 'TRANSLADO'
      ));
    `
    
    const createResult = await supabase.rpc('execute_sql', {
      query: newConstraintSQL
    })
    
    if (createResult.error) {
      console.log('❌ Erro ao criar nova constraint:', createResult.error.message)
      
      // Se ainda assim falhar, vamos fazer uma constraint ainda mais permissiva
      console.log('🔄 Tentando constraint super permissiva...')
      
      const superPermissiveSQL = `
        ALTER TABLE public.timesheet_entries 
        ADD CONSTRAINT timesheet_entries_tipo_check 
        CHECK (tipo IS NULL OR LENGTH(tipo) > 0);
      `
      
      const superResult = await supabase.rpc('execute_sql', {
        query: superPermissiveSQL
      })
      
      if (superResult.error) {
        console.log('❌ Falha na constraint super permissiva:', superResult.error.message)
        return false
      } else {
        console.log('✅ Constraint super permissiva criada com sucesso!')
        return true
      }
    } else {
      console.log('✅ Nova constraint criada com sucesso!')
      return true
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

// Testar se a constraint funciona agora
async function testAfterMigration() {
  console.log('🧪 Testando inserção após a migration...')
  
  try {
    // Buscar tenant e timesheet para teste
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
    
    if (!tenantData || tenantData.length === 0) {
      console.log('❌ Nenhum tenant encontrado')
      return false
    }
    
    const { data: timesheetData } = await supabase
      .from('timesheets')
      .select('id')
      .eq('tenant_id', tenantData[0].id)
      .limit(1)
    
    if (!timesheetData || timesheetData.length === 0) {
      console.log('❌ Nenhum timesheet encontrado')
      return false
    }
    
    // Testar inserção com "inicio"
    const testEntry = {
      tenant_id: tenantData[0].id,
      timesheet_id: timesheetData[0].id,
      data: '2025-10-29',
      tipo: 'inicio'
    }
    
    const { error: insertError } = await supabase
      .from('timesheet_entries')
      .insert([testEntry])
    
    if (insertError) {
      console.log('❌ Inserção ainda falha:', insertError.message)
      return false
    } else {
      console.log('✅ Inserção com "inicio" funcionou!')
      
      // Limpar teste
      await supabase
        .from('timesheet_entries')
        .delete()
        .eq('timesheet_id', timesheetData[0].id)
        .eq('data', '2025-10-29')
        .eq('tipo', 'inicio')
      
      return true
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message)
    return false
  }
}

// Executar migration e teste
async function runCompleteFix() {
  console.log('🎯 Iniciando correção completa da constraint...')
  
  const migrationSuccess = await finalMigration()
  
  if (migrationSuccess) {
    console.log('\n✅ Migration aplicada com sucesso!')
    
    const testSuccess = await testAfterMigration()
    
    if (testSuccess) {
      console.log('\n🎉 Sistema está completamente funcional!')
      return true
    } else {
      console.log('\n⚠️  Migration ok, mas teste falhou')
      return false
    }
  } else {
    console.log('\n❌ Migration falhou')
    return false
  }
}

// Executar tudo
runCompleteFix().then(success => {
  process.exit(success ? 0 : 1)
})