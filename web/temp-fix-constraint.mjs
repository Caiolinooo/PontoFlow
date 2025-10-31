import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arzvingdtnttiejcvucs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixTipoConstraint() {
  console.log('🚀 Iniciando correção da constraint timesheet_entries_tipo_check...')
  
  try {
    // Step 1: Drop existing constraint
    console.log('📋 Removendo constraint existente...')
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: 'ALTER TABLE public.timesheet_entries DROP CONSTRAINT IF EXISTS timesheet_entries_tipo_check;'
    })
    
    if (dropError) {
      console.log('⚠️  Drop constraint via RPC falhou, tentando alternativa...')
      // Alternative approach - direct SQL execution might not be available via RPC
      // Let's try a different approach
    }

    // Step 2: Create new constraint
    console.log('📝 Criando nova constraint...')
    const newConstraintQuery = `
      ALTER TABLE public.timesheet_entries 
      ADD CONSTRAINT timesheet_entries_tipo_check 
      CHECK (tipo IS NULL OR tipo IN (
          'inicio', 'pausa', 'fim', 'embarque', 'desembarque', 'espera', 'refeicao',
          'trabalho', 'ferias', 'licenca', 'doenca', 'treinamento', 'manutencao', 'viagem', 'administrativo'
      ));
    `
    
    const { error: addError } = await supabase.rpc('exec_sql', {
      query: newConstraintQuery
    })
    
    if (addError) {
      console.log('❌ Erro ao adicionar constraint:', addError.message)
      // Let's check current state instead
      console.log('🔍 Verificando estado atual da constraint...')
      const { data: constraintData, error: checkError } = await supabase
        .from('information_schema.table_constraints')
        .select('*')
        .eq('table_name', 'timesheet_entries')
        .eq('constraint_name', 'timesheet_entries_tipo_check')
      
      if (checkError) {
        console.log('❌ Erro ao verificar constraints:', checkError.message)
      } else {
        console.log('📊 Constraints encontradas:', constraintData)
      }
      
      return false
    }

    console.log('✅ Constraint aplicada com sucesso!')
    
    // Step 3: Verify current values
    console.log('🔍 Verificando valores atuais em uso...')
    const { data: valuesData, error: valuesError } = await supabase
      .from('timesheet_entries')
      .select('tipo')
      .not('tipo', 'is', null)
    
    if (valuesError) {
      console.log('❌ Erro ao verificar valores:', valuesError.message)
    } else {
      const uniqueValues = [...new Set(valuesData.map(row => row.tipo))]
      console.log('📊 Valores encontrados:', uniqueValues)
      
      // Check if "inicio" is now allowed
      if (uniqueValues.includes('inicio')) {
        console.log('✅ Valor "inicio" encontrado e deve estar funcionando agora!')
      }
    }
    
    return true
    
  } catch (error) {
    console.error('❌ Erro durante a execução:', error.message)
    return false
  }
}

// Run the fix
fixTipoConstraint().then(success => {
  if (success) {
    console.log('🎉 Migração concluída com sucesso!')
  } else {
    console.log('❌ Migração falhou. Verifique os logs acima.')
  }
  process.exit(success ? 0 : 1)
})