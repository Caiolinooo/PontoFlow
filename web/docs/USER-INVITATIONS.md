# Sistema de Convites de Usuários

## 📋 Visão Geral

O sistema de convites permite que administradores convidem novos usuários para o PontoFlow através de emails. Os usuários recebem um link de convite e podem completar seu cadastro de forma segura e simplificada.

## 🎯 Funcionalidades

### Para Administradores

1. **Enviar Convites**
   - Preencher informações básicas do usuário (nome, email, telefone, cargo, departamento)
   - Definir a função/role do usuário (USER, MANAGER_TIMESHEET, MANAGER, ADMIN)
   - Pré-configurar tenants aos quais o usuário terá acesso
   - Pré-configurar grupos aos quais o usuário pertencerá
   - Para gerentes: pré-configurar quais grupos eles irão gerenciar

2. **Gerenciar Convites**
   - Visualizar todos os convites (pendentes, aceitos, expirados, cancelados)
   - Reenviar convites pendentes
   - Cancelar convites pendentes
   - Copiar link do convite para compartilhar manualmente
   - Ver data de expiração (7 dias por padrão)

### Para Usuários Convidados

1. **Receber Convite**
   - Email com link personalizado e informações sobre o convite
   - Design corporativo com branding do PontoFlow

2. **Aceitar Convite**
   - Clicar no link do email
   - Ver informações pré-preenchidas (nome, email, função)
   - Completar informações opcionais (telefone, cargo, departamento)
   - Criar senha segura (mínimo 8 caracteres, com maiúsculas, minúsculas, números e caracteres especiais)
   - Confirmar senha

3. **Acesso Imediato**
   - Email automaticamente verificado
   - Acesso aos tenants e grupos pré-configurados
   - Para gerentes: permissões de gerenciamento já configuradas

## 🗄️ Estrutura do Banco de Dados

### Tabela: `user_invitations`

```sql
CREATE TABLE user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT,
    position TEXT,
    department TEXT,
    role TEXT NOT NULL CHECK (role IN ('USER', 'MANAGER_TIMESHEET', 'MANAGER', 'ADMIN')),
    token TEXT NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES users_unified(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    tenant_ids UUID[] DEFAULT '{}',
    group_ids UUID[] DEFAULT '{}',
    managed_group_ids UUID[] DEFAULT '{}',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);
```

### Índices

- `idx_user_invitations_token` - Para busca rápida por token
- `idx_user_invitations_email` - Para busca por email
- `idx_user_invitations_status` - Para filtrar por status
- `idx_user_invitations_expires_at` - Para identificar convites expirados

### RLS Policies

- **SELECT**: Apenas ADMINs podem visualizar convites
- **INSERT**: Apenas ADMINs podem criar convites
- **UPDATE**: Apenas ADMINs podem atualizar convites
- **DELETE**: Apenas ADMINs podem deletar convites

## 🔌 API Endpoints

### Admin Endpoints (Requer autenticação ADMIN)

#### `GET /api/admin/invitations`
Lista todos os convites com paginação e filtros.

**Query Parameters:**
- `status` - Filtrar por status (pending, accepted, expired, cancelled)
- `page` - Número da página (padrão: 1)
- `limit` - Itens por página (padrão: 20)

**Response:**
```json
{
  "invitations": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "João",
      "last_name": "Silva",
      "role": "USER",
      "status": "pending",
      "expires_at": "2024-01-15T10:00:00Z",
      "created_at": "2024-01-08T10:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

#### `POST /api/admin/invitations`
Cria um novo convite e envia email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "phone_number": "+55 11 99999-9999",
  "position": "Desenvolvedor",
  "department": "TI",
  "role": "USER",
  "tenant_ids": ["uuid1", "uuid2"],
  "group_ids": ["uuid3", "uuid4"],
  "managed_group_ids": ["uuid5"]
}
```

**Response:**
```json
{
  "invitation": {
    "id": "uuid",
    "email": "user@example.com",
    "token": "unique-token",
    "expires_at": "2024-01-15T10:00:00Z"
  }
}
```

#### `POST /api/admin/invitations/[id]`
Reenvia um convite pendente.

**Response:**
```json
{
  "message": "Invitation resent successfully"
}
```

#### `DELETE /api/admin/invitations/[id]`
Cancela um convite pendente.

**Response:**
```json
{
  "message": "Invitation cancelled successfully"
}
```

### Public Endpoints (Sem autenticação)

#### `GET /api/auth/accept-invite?token=xxx`
Valida um token de convite e retorna os detalhes.

**Response:**
```json
{
  "invitation": {
    "email": "user@example.com",
    "first_name": "João",
    "last_name": "Silva",
    "role": "USER",
    "phone_number": "+55 11 99999-9999",
    "position": "Desenvolvedor",
    "department": "TI"
  }
}
```

#### `POST /api/auth/accept-invite`
Aceita um convite e cria a conta do usuário.

**Request Body:**
```json
{
  "token": "unique-token",
  "password": "SecurePass123!",
  "phone_number": "+55 11 99999-9999",
  "position": "Desenvolvedor",
  "department": "TI"
}
```

**Response:**
```json
{
  "message": "Invitation accepted successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "João",
    "last_name": "Silva"
  }
}
```

## 📧 Template de Email

O email de convite inclui:
- Logo do PontoFlow
- Mensagem de boas-vindas personalizada
- Informações sobre a função atribuída
- Botão de ação destacado com link do convite
- Data de expiração do convite
- Informações de contato para suporte

## 🔒 Segurança

1. **Tokens Únicos**: Cada convite tem um token UUID v4 único e criptograficamente seguro
2. **Expiração**: Convites expiram após 7 dias
3. **Status Tracking**: Convites não podem ser reutilizados após aceitos ou cancelados
4. **Validação de Email**: Emails são validados antes do envio
5. **Senha Forte**: Requisitos de complexidade para senhas
6. **Email Verificado**: Usuários convidados têm email automaticamente verificado
7. **RLS**: Políticas de Row Level Security protegem os dados

## 🚀 Como Usar

### 1. Executar Migração

```bash
cd web
node exec-invitations-migration.mjs
```

Ou manualmente no Supabase SQL Editor:
1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá para SQL Editor
4. Copie e cole o conteúdo de `web/docs/migrations/user-invitations.sql`
5. Clique em "Run"

### 2. Configurar Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Enviar Convite

1. Acesse a página de usuários: `/admin/users`
2. Clique em "📧 Convidar Usuário"
3. Preencha o formulário com as informações do usuário
4. Selecione tenants e grupos (opcional)
5. Para gerentes, selecione grupos gerenciados
6. Clique em "Enviar Convite"

### 4. Usuário Aceita Convite

1. Usuário recebe email com link do convite
2. Clica no link
3. Vê informações pré-preenchidas
4. Completa informações opcionais
5. Cria senha segura
6. Clica em "Completar Cadastro"
7. É redirecionado para a página de login

## 📱 Páginas

### `/admin/users`
- Lista de usuários
- Botão "Convidar Usuário"
- Seção de convites pendentes (últimos 3)
- Link para página completa de convites

### `/admin/users/invitations`
- Lista completa de convites
- Filtros por status
- Ações: Reenviar, Cancelar, Copiar Link
- Paginação

### `/auth/accept-invite?token=xxx`
- Página pública de aceite de convite
- Validação de token
- Formulário de conclusão de cadastro
- Redirecionamento para login após sucesso

## 🎨 Componentes

### `InviteUserModal.tsx`
Modal para criar novos convites com formulário completo.

### `InvitationRowActions.tsx`
Componente de ações para cada convite na lista (reenviar, cancelar, copiar link).

### `UsersPageClient.tsx`
Componente client-side para gerenciar botões e modal na página de usuários.

## 🔄 Fluxo Completo

```
Admin                          Sistema                         Usuário
  |                              |                               |
  |--[1] Cria convite---------->|                               |
  |                              |--[2] Gera token único         |
  |                              |--[3] Salva no banco           |
  |                              |--[4] Envia email------------>|
  |<-[5] Confirmação-------------|                               |
  |                              |                               |
  |                              |<--[6] Clica no link-----------|
  |                              |--[7] Valida token             |
  |                              |--[8] Mostra formulário------->|
  |                              |                               |
  |                              |<--[9] Submete cadastro--------|
  |                              |--[10] Cria usuário            |
  |                              |--[11] Atribui permissões      |
  |                              |--[12] Marca como aceito       |
  |                              |--[13] Redireciona para login->|
```

## 🐛 Troubleshooting

### Email não está sendo enviado
- Verifique as configurações SMTP no arquivo `.env`
- Para Gmail, certifique-se de usar uma "App Password"
- Verifique os logs do servidor para erros de SMTP

### Token inválido ou expirado
- Convites expiram após 7 dias
- Tokens só podem ser usados uma vez
- Admin pode reenviar o convite para gerar um novo token

### Usuário não recebe permissões
- Verifique se os tenant_ids e group_ids foram configurados corretamente
- Verifique as políticas RLS nas tabelas relacionadas
- Verifique os logs do servidor durante o aceite do convite

## 📝 Notas Importantes

1. **Separação do EmployeeHub**: Usuários criados através deste sistema são gerenciados na tabela `users_unified` e NÃO têm acesso ao projeto EmployeeHub
2. **Email Verificado**: Usuários convidados têm o email automaticamente verificado (`email_verified: true`)
3. **Expiração Automática**: Uma função PostgreSQL marca automaticamente convites expirados
4. **Unicidade de Email**: O sistema verifica se o email já está cadastrado antes de enviar o convite
5. **Auditoria**: Todos os convites registram quem convidou (`invited_by`) e quando (`created_at`, `accepted_at`)

