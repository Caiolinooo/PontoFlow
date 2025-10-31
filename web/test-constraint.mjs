import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arzvingdtnttiejcvucs.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDk0NjcyOSwiZXhwIjoyMDYwNTIyNzI5fQ.Rfo5jOH3iFxFBPyV7mNtG7Ja29AFskUQYYA4fgG2HAk'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function testConstraint() {
  console.log('🔍 Testando constraint atual com inserção...')
  
  try {
    // Primeiro, vamos verificar a constraint atual
    console.log('📋 Verificando constraint atual...')
    const { data: constraintData, error: constraintError } = await supabase
      .rpc('pg_catalog', {
        query: `SELECT conname, consrc FROM pg_constraint WHERE conname = 'timesheet_entries_tipo_check'`
      })
    
    if (constraintError) {
      console.log('⚠️  Não foi possível verificar constraint via RPC')
    } else {
      console.log('📊 Constraint atual:', constraintData)
    }
    
    // Vamos buscar um tenant e timesheet válidos para o teste
    console.log('🔍 Buscando dados válidos para teste...')
    
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
    
    if (!tenantData || tenantData.length === 0) {
      console.log('❌ Nenhum tenant encontrado para teste')
      return false
    }
    
    const tenantId = tenantData[0].id
    
    const { data: timesheetData } = await supabase
      .from('timesheets')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
    
    if (!timesheetData || timesheetData.length === 0) {
      console.log('❌ Nenhum timesheet encontrado para teste')
      return false
    }
    
    const timesheetId = timesheetData[0].id
    
    console.log(`✅ Usando tenant_id: ${tenantId}`)
    console.log(`✅ Usando timesheet_id: ${timesheetId}`)
    
    // Testar inserção com "inicio" (que deveria falhar na constraint atual)
    console.log('🧪 Testando inserção com tipo "inicio"...')
    
    const testEntry = {
      tenant_id: tenantId,
      timesheet_id: timesheetId,
      data: '2025-10-29',
      tipo: 'inicio' // Este valor deve falhar na constraint atual
    }
    
    const { error: insertError } = await supabase
      .from('timesheet_entries')
      .insert([testEntry])
    
    if (insertError) {
      console.log('❌ Erro esperado na inserção:', insertError.message)
      console.log('📝 Isso confirma que a constraint ainda bloqueia "inicio"')
      
      // Testar com valor permitido
      console.log('🧪 Testando inserção com tipo permitido...')
      
      const allowedTestEntry = {
        tenant_id: tenantId,
        timesheet_id: timesheetId,
        data: '2025-10-29',
        tipo: 'folga' // Este valor vimos que já existe
      }
      
      const { error: allowedError } = await supabase
        .from('timesheet_entries')
        .insert([allowedTestEntry])
      
      if (allowedError) {
        console.log('❌ Erro no valor permitido:', allowedError.message)
      } else {
        console.log('✅ Inserção com valor permitido funcionou!')
        
        // Limpar o teste
        await supabase
          .from('timesheet_entries')
          .delete()
          .eq('timesheet_id', timesheetId)
          .eq('data', '2025-10-29')
          .eq('tipo', 'folga')
      }
      
      return false
    } else {
      console.log('✅ Inserção com "inicio" funcionou! Constraint já foi corrigida.')
      
      // Limpar o teste
      await supabase
        .from('timesheet_entries')
        .delete()
        .eq('timesheet_id', timesheetId)
        .eq('data', '2025-10-29')
        .eq('tipo', 'inicio')
      
      return true
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

// Executar o teste
testConstraint().then(success => {
  if (success) {
    console.log('🎉 Constraint já está funcionando corretamente!')
  } else {
    console.log('⚠️  Constraint ainda precisa ser corrigida.')
  }
  process.exit(success ? 0 : 1)
})