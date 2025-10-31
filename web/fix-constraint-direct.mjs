import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arzvingdtnttiejcvucs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixConstraintDirectly() {
  console.log('🚀 Iniciando correção direta da constraint...')
  
  try {
    // First, let's try to insert a test record to see the current constraint behavior
    console.log('🔍 Testando constraint atual com inserção de teste...')
    
    const testInsert = {
      employee_id: '00000000-0000-0000-0000-000000000000', // UUID de teste
      date: '2025-10-29',
      tipo: 'inicio', // Este é o valor problemático
      description: 'Teste de constraint'
    }
    
    const { data, error } = await supabase
      .from('timesheet_entries')
      .insert([testInsert])
      .select()
    
    if (error) {
      console.log('❌ Erro na inserção de teste:', error.message)
      console.log('📝 Isso confirma que a constraint está bloqueando o valor "inicio"')
      
      // Vamos verificar se existe alguma entrada para ver quais tipos são permitidos
      console.log('🔍 Verificando entradas existentes...')
      const { data: existingData, error: fetchError } = await supabase
        .from('timesheet_entries')
        .select('tipo')
        .not('tipo', 'is', null)
        .limit(10)
      
      if (fetchError) {
        console.log('❌ Erro ao buscar entradas:', fetchError.message)
      } else {
        const types = [...new Set(existingData.map(row => row.tipo))]
        console.log('📊 Tipos encontrados:', types)
      }
      
      return false
    } else {
      console.log('✅ Inserção bem-sucedida! Constraint já foi corrigida.')
      return true
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

// Executar a verificação
fixConstraintDirectly().then(success => {
  if (success) {
    console.log('🎉 Sistema está funcionando corretamente!')
  } else {
    console.log('⚠️  Sistema ainda tem problemas de constraint.')
  }
  process.exit(success ? 0 : 1)
})