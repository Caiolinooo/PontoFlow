# 🐛 Debug: Erro 400 na Criação de Convites

## 📋 Problema Reportado

**Sintoma:** Erro 400 ao tentar criar convite de usuário através do painel admin  
**Endpoint:** `POST /api/admin/invitations`  
**Tempo de resposta:** ~3102ms  
**Usuário:** caio.correia@groupabz.com (ADMIN)  
**Tenants:** 2 tenants disponíveis  
**Tenant selecionado:** `2376edb6-bcda-47f6-a0c7-cecd701298ca`

---

## 🔍 Investigação Realizada

### Logs Detalhados Adicionados

#### **Backend: `/api/admin/invitations/route.ts`**

Adicionados logs em cada etapa do processo:

1. **Autenticação**
   ```typescript
   console.log('🚀 [POST /api/admin/invitations] Request received');
   console.log('✅ [Auth] User authenticated:', currentUser.email, 'Role:', currentUser.role);
   ```

2. **Request Body**
   ```typescript
   console.log('📨 [POST /api/admin/invitations] Request body:', JSON.stringify(body, null, 2));
   ```

3. **Validações**
   ```typescript
   console.log('🔍 [Validation] Checking required fields...');
   console.log('  - email:', email);
   console.log('  - first_name:', first_name);
   console.log('  - last_name:', last_name);
   console.log('  - role:', role);
   
   console.log('🔍 [Validation] Checking email format...');
   console.log('🔍 [Validation] Checking managed_group_ids...');
   console.log('✅ [Validation] All validations passed');
   ```

4. **Verificações de Banco de Dados**
   ```typescript
   console.log('🔍 [Database] Checking for existing user with email:', email.toLowerCase());
   console.log('✅ [Database] No existing user found');
   
   console.log('🔍 [Database] Checking for pending invitation...');
   console.log('✅ [Database] No pending invitation found');
   ```

5. **Criação do Convite**
   ```typescript
   console.log('🔑 [Token] Generated token:', token);
   console.log('💾 [Database] Creating invitation with data:', JSON.stringify(invitationData, null, 2));
   console.log('✅ [Database] Invitation created successfully:', invitation.id);
   ```

6. **Erros**
   ```typescript
   console.error('❌ [Validation] Missing required fields');
   console.error('❌ [Validation] Invalid email format:', email);
   console.error('❌ [Validation] Non-manager role with managed groups:', role);
   console.error('❌ [Database] Error creating invitation:', createError);
   console.error('❌ [POST /api/admin/invitations] Unhandled error:', error);
   ```

#### **Frontend: `InviteUserModal.tsx`**

Adicionados logs no envio e recebimento:

```typescript
console.log('📤 [InviteUserModal] Sending invitation request:', payload);
console.log('📥 [InviteUserModal] Response status:', response.status);
console.log('📥 [InviteUserModal] Response data:', data);
console.error('❌ [InviteUserModal] Error response:', data);
console.error('❌ [InviteUserModal] Unexpected error:', err);
```

---

## 🎯 Possíveis Causas do Erro 400

### 1. **Campos Obrigatórios Faltando**
```typescript
if (!email || !first_name || !last_name || !role) {
  return NextResponse.json(
    { error: 'Campos obrigatórios: email, first_name, last_name, role' },
    { status: 400 }
  );
}
```

**Como identificar nos logs:**
```
❌ [Validation] Missing required fields
```

---

### 2. **Email Inválido**
```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  return NextResponse.json(
    { error: 'Email inválido' },
    { status: 400 }
  );
}
```

**Como identificar nos logs:**
```
❌ [Validation] Invalid email format: [email]
```

---

### 3. **Grupos Gerenciados para Não-Gerente**
```typescript
if (managed_group_ids && managed_group_ids.length > 0) {
  if (role !== 'MANAGER' && role !== 'MANAGER_TIMESHEET') {
    return NextResponse.json(
      { error: 'Apenas gerentes podem ter grupos gerenciados' },
      { status: 400 }
    );
  }
}
```

**Como identificar nos logs:**
```
❌ [Validation] Non-manager role with managed groups: USER
```

**⚠️ ATENÇÃO:** Esta validação foi adicionada recentemente e pode ser a causa!

---

### 4. **Email Já Cadastrado**
```typescript
if (existingUser) {
  return NextResponse.json(
    { error: 'Este email já está cadastrado no sistema' },
    { status: 400 }
  );
}
```

**Como identificar nos logs:**
```
❌ [Validation] User already exists: [user-id]
```

---

### 5. **Convite Pendente Existente**
```typescript
if (existingInvitation) {
  return NextResponse.json(
    { error: 'Já existe um convite pendente para este email' },
    { status: 400 }
  );
}
```

**Como identificar nos logs:**
```
❌ [Validation] Pending invitation already exists: [invitation-id]
```

---

### 6. **Erro de Autenticação**
```typescript
try {
  currentUser = await requireApiRole(['ADMIN']);
} catch (authError: any) {
  return NextResponse.json(
    { error: authError.message === 'Unauthorized' ? 'Não autenticado' : 'Sem permissão' },
    { status: authError.message === 'Unauthorized' ? 401 : 403 }
  );
}
```

**Como identificar nos logs:**
```
❌ [Auth] Authentication failed: Unauthorized
```

---

## 🧪 Como Testar

### Passo 1: Preparar Ambiente
1. Abra o **Console do Navegador** (F12 → Console)
2. Abra o **Terminal do Servidor** (onde Next.js está rodando)
3. Limpe ambos os consoles

### Passo 2: Reproduzir o Erro
1. Acesse `/admin/users`
2. Clique em "Convidar Usuário"
3. Preencha o formulário
4. Clique em "Enviar Convite"

### Passo 3: Coletar Logs

#### **Console do Navegador:**
Procure por linhas começando com:
- `📤 [InviteUserModal] Sending invitation request:`
- `📥 [InviteUserModal] Response status:`
- `📥 [InviteUserModal] Response data:`
- `❌ [InviteUserModal] Error response:`

#### **Terminal do Servidor:**
Procure por linhas começando com:
- `🚀 [POST /api/admin/invitations] Request received`
- `✅ [Auth] User authenticated:`
- `📨 [POST /api/admin/invitations] Request body:`
- `🔍 [Validation] Checking...`
- `❌ [Validation] ...` ou `❌ [Database] ...`

### Passo 4: Identificar a Causa

Compare os logs com as **Possíveis Causas** listadas acima para identificar exatamente qual validação está falhando.

---

## 🔧 Correções Aplicadas

### 1. **Melhor Tratamento de Erros de Autenticação**
```typescript
try {
  currentUser = await requireApiRole(['ADMIN']);
  console.log('✅ [Auth] User authenticated:', currentUser.email, 'Role:', currentUser.role);
} catch (authError: any) {
  console.error('❌ [Auth] Authentication failed:', authError.message);
  return NextResponse.json(
    { error: authError.message === 'Unauthorized' ? 'Não autenticado' : 'Sem permissão' },
    { status: authError.message === 'Unauthorized' ? 401 : 403 }
  );
}
```

### 2. **Logs de Erros de Banco de Dados**
```typescript
if (userCheckError) {
  console.error('❌ [Database] Error checking existing user:', userCheckError);
}

if (inviteCheckError) {
  console.error('❌ [Database] Error checking pending invitation:', inviteCheckError);
}

if (createError) {
  console.error('❌ [Database] Error creating invitation:', createError);
  console.error('❌ [Database] Error details:', JSON.stringify(createError, null, 2));
  return NextResponse.json(
    { error: 'Erro ao criar convite', details: createError.message },
    { status: 500 }
  );
}
```

### 3. **Logs Detalhados do Payload**
```typescript
const invitationData = {
  email: email.toLowerCase(),
  first_name,
  last_name,
  phone_number: phone_number || null,
  position: position || null,
  department: department || null,
  role,
  token,
  invited_by: currentUser.id,
  tenant_ids: tenant_ids || [],
  group_ids: group_ids || [],
  managed_group_ids: managed_group_ids || [],
  status: 'pending',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

console.log('💾 [Database] Creating invitation with data:', JSON.stringify(invitationData, null, 2));
```

---

## 📊 Fluxo de Validação

```
┌─────────────────────────────────────┐
│ 1. Autenticação (requireApiRole)   │
│    ✅ User is ADMIN?                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. Validar Campos Obrigatórios      │
│    ✅ email, first_name, last_name, │
│       role estão presentes?         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. Validar Formato de Email         │
│    ✅ Email válido?                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. Validar Grupos Gerenciados       │
│    ✅ Se managed_group_ids não      │
│       vazio, role é MANAGER?        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 5. Verificar Email Duplicado        │
│    ✅ Email não existe em           │
│       users_unified?                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 6. Verificar Convite Pendente       │
│    ✅ Não há convite pendente       │
│       para este email?              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 7. Criar Convite                    │
│    💾 Insert em user_invitations    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 8. Enviar Email                     │
│    📧 Nodemailer                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ ✅ Sucesso!                         │
└─────────────────────────────────────┘
```

---

## 🎯 Próximos Passos

1. **Executar o teste** conforme descrito acima
2. **Coletar os logs** do console e terminal
3. **Identificar qual validação está falhando**
4. **Aplicar correção específica** baseada na causa identificada

---

## 📝 Notas Importantes

- ⚠️ A validação de `managed_group_ids` foi adicionada recentemente e pode ser a causa mais provável
- ⚠️ Verifique se o frontend está enviando `managed_group_ids: []` (array vazio) ao invés de `undefined` ou `null`
- ⚠️ Verifique se a role selecionada no formulário está sendo enviada corretamente
- ⚠️ O tempo de resposta de ~3102ms sugere que o erro pode estar ocorrendo após consultas ao banco de dados

---

---

## ✅ SOLUÇÃO IMPLEMENTADA: Perfis Órfãos

### Problema Identificado

O sistema estava retornando erro 400 "Este email já está cadastrado no sistema" mesmo quando o usuário não estava completamente cadastrado. Isso acontecia porque:

1. **Trigger automático:** Quando um usuário é criado no `auth.users` (Supabase Auth), um trigger automaticamente cria um perfil na tabela `profiles`
2. **Perfis órfãos:** Esses perfis podem ser criados sem que o usuário tenha um registro completo em `users_unified` ou `tenant_user_roles`
3. **Validação incorreta:** A validação anterior verificava apenas se existia um perfil, sem verificar se o usuário estava completamente cadastrado

### Solução Aplicada

#### 1. **Verificação Inteligente na Criação de Convites** (`/api/admin/invitations`)

```typescript
// Verifica primeiro se existe em users_unified (tabela principal)
const { data: existingUser } = await supabase
  .from('users_unified')
  .select('id, email, active')
  .eq('email', email.toLowerCase())
  .maybeSingle();

if (existingUser) {
  // Usuário completamente cadastrado - bloquear
  return NextResponse.json(
    { error: 'Este email já está cadastrado no sistema' },
    { status: 400 }
  );
}

// Verifica se existe perfil órfão (sem tenant roles)
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('user_id, email')
  .eq('email', email.toLowerCase())
  .maybeSingle();

if (existingProfile) {
  // Verifica se tem tenant roles (indica cadastro completo)
  const { data: tenantRoles } = await supabase
    .from('tenant_user_roles')
    .select('id')
    .eq('user_id', existingProfile.user_id)
    .limit(1);

  if (tenantRoles && tenantRoles.length > 0) {
    // Tem tenant roles - usuário completamente cadastrado
    return NextResponse.json(
      { error: 'Este email já está cadastrado no sistema' },
      { status: 400 }
    );
  }
  
  // Perfil órfão (sem tenant roles) - permitir convite
  console.log('⚠️ [Database] Found orphaned profile (no tenant roles), allowing invitation to proceed');
}
```

**Lógica:**
- ✅ Se existe em `users_unified` → **Bloquear** (usuário completamente cadastrado)
- ✅ Se existe perfil com tenant roles → **Bloquear** (cadastro completo)
- ✅ Se existe perfil sem tenant roles → **Permitir** (perfil órfão, convite completará o cadastro)

#### 2. **Tratamento de Perfis Órfãos no Accept-Invite** (`/api/auth/accept-invite`)

```typescript
// Verifica se existe perfil órfão
const { data: existingProfile } = await supabase
  .from('profiles')
  .select('user_id')
  .eq('email', invitation.email.toLowerCase())
  .maybeSingle();

if (existingProfile) {
  // Se user_id diferente, é um perfil órfão
  if (existingProfile.user_id !== newUser.id) {
    console.log('⚠️ [Profile] Found orphaned profile, deleting and creating new one');
    
    // Deleta perfil órfão
    await supabase
      .from('profiles')
      .delete()
      .eq('user_id', existingProfile.user_id);
  }
  
  // Cria/atualiza perfil com user_id correto
  await supabase
    .from('profiles')
    .upsert({
      user_id: newUser.id,
      display_name: `${invitation.first_name} ${invitation.last_name}`,
      email: invitation.email.toLowerCase(),
      phone: phone_number || invitation.phone_number || null,
      ativo: true,
      locale: 'pt-BR',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });
}
```

**Lógica:**
- ✅ Se perfil órfão existe com `user_id` diferente → **Deleta e cria novo**
- ✅ Se perfil existe com mesmo `user_id` → **Atualiza**
- ✅ Se não existe perfil → **Cria novo**

### Resultado

Agora o sistema:
1. ✅ **Permite convites** para emails com perfis órfãos (sem cadastro completo)
2. ✅ **Bloqueia convites** apenas para usuários completamente cadastrados
3. ✅ **Lida corretamente** com perfis órfãos ao aceitar convites
4. ✅ **Logs detalhados** para diagnóstico de problemas

### Logs Esperados

**Quando encontrar perfil órfão:**
```
⚠️ [Database] Profile found, checking if user is fully registered: [user-id]
⚠️ [Database] Found orphaned profile (no tenant roles), allowing invitation to proceed
✅ [Database] No fully registered user found
```

**Quando aceitar convite com perfil órfão:**
```
⚠️ [Profile] Found orphaned profile with user_id: [old-user-id]
   Deleting orphaned profile and creating new one with user_id: [new-user-id]
```

---

**Data:** 2025-01-04  
**Versão:** 2.0.0  
**Status:** ✅ Solução implementada e testada

