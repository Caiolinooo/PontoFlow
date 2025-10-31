import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arzvingdtnttiejcvucs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkExistingValues() {
  console.log('🔍 Verificando valores existentes na tabela timesheet_entries...')
  
  try {
    // Verificar valores únicos na coluna tipo
    const { data, error } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT 
            tipo, 
            COUNT(*) as count 
          FROM public.timesheet_entries 
          WHERE tipo IS NOT NULL 
          GROUP BY tipo 
          ORDER BY tipo
        `
      })
    
    if (error) {
      console.log('❌ Erro ao buscar valores:', error.message)
      return false
    }
    
    console.log('📊 Valores encontrados na tabela:')
    data.forEach(row => {
      console.log(`   - "${row.tipo}": ${row.count} registros`)
    })
    
    // Também verificar quantos registros têm tipo NULL
    const { data: nullCountData, error: nullError } = await supabase
      .rpc('execute_sql', {
        query: `
          SELECT COUNT(*) as null_count 
          FROM public.timesheet_entries 
          WHERE tipo IS NULL
        `
      })
    
    if (!nullError && nullCountData.length > 0) {
      console.log(`   - NULL: ${nullCountData[0].null_count} registros`)
    }
    
    console.log('\n💡 Estes são os valores que precisamos incluir na constraint.')
    return true
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

// Executar a verificação
checkExistingValues().then(success => {
  if (success) {
    console.log('\n✅ Verificação concluída!')
  } else {
    console.log('\n❌ Falha na verificação.')
  }
  process.exit(success ? 0 : 1)
})