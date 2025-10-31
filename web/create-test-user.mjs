import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://arzvingdtnttiejcvucs.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyenZpbmdkdG50dGllamN2dWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5NDY3MjksImV4cCI6MjA2MDUyMjcyOX0.8OYE8Dg3haAxQ7p3MUiLJE_wiy2rCKsWiszMVwwo1LI'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTestUser() {
  console.log('👤 Criando usuário de teste...')
  
  try {
    // Criar usuário de teste usando o Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: 'teste@abzgroup.com',
      password: 'teste123456',
      options: {
        data: {
          display_name: 'Usuário de Teste'
        }
      }
    })
    
    if (error) {
      console.log('❌ Erro ao criar usuário:', error.message)
      
      // Se já existe, tentar fazer login
      console.log('🔐 Tentando fazer login com usuário existente...')
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: 'teste@abzgroup.com',
        password: 'teste123456'
      })
      
      if (loginError) {
        console.log('❌ Erro no login:', loginError.message)
        return false
      } else {
        console.log('✅ Login bem-sucedido!')
        console.log('📊 Token de acesso:', loginData.access_token ? 'Disponível' : 'Não disponível')
        return true
      }
    } else {
      console.log('✅ Usuário criado com sucesso!')
      console.log('📧 Email confirmado:', data.user?.email_confirmed_at ? 'Sim' : 'Não')
      return true
    }
    
  } catch (error) {
    console.error('❌ Erro inesperado:', error.message)
    return false
  }
}

// Executar
createTestUser().then(success => {
  if (success) {
    console.log('\n🎉 Usuário de teste está pronto!')
  } else {
    console.log('\n❌ Falha ao preparar usuário de teste.')
  }
  process.exit(success ? 0 : 1)
})