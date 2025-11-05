# Como Executar a Migration Manualmente

A API do Supabase está com timeout. Por favor, execute a migration manualmente seguindo estes passos:

## Passo 1: Acessar o Supabase Dashboard

1. Acesse: https://supabase.com/dashboard
2. Selecione o projeto: **Timesheet_Project** (ID: knicakgqydicrvyohcni)
3. No menu lateral, clique em **SQL Editor**

## Passo 2: Executar o SQL

Copie e cole o seguinte SQL no editor e clique em **Run**:

```sql
-- Update comment to document extended email settings structure
COMMENT ON COLUMN public.tenants.settings IS 
'JSONB field for tenant-specific settings including:
- email: Complete email configuration (provider, smtp, oauth2, sendgrid, ses, deliverability)
- smtp: Legacy per-tenant SMTP override (deprecated, use email.smtp instead)
- branding: Tenant branding (logo_url, banner_url, watermark_url, primary_color, secondary_color)
- notifications: Notification preferences
- features: Feature flags';

-- Create index for tenants with email configured
CREATE INDEX IF NOT EXISTS idx_tenants_email_configured 
ON public.tenants ((settings->'email'->>'provider'))
WHERE settings ? 'email';
```

## Passo 3: Verificar

Após executar, você deve ver a mensagem: **Success. No rows returned**

## Nota Importante

⚠️ **A migration NÃO é obrigatória para o funcionamento do sistema!**

O sistema funcionará perfeitamente sem executar a migration. A migration apenas:
- Adiciona documentação ao campo `settings`
- Cria um índice para melhorar performance de queries

Você pode testar o sistema agora mesmo sem executar a migration.

## Testando o Sistema

1. Inicie o servidor: `npm run dev`
2. Acesse: http://localhost:3000
3. Faça login como ADMIN
4. Vá para: Admin → Settings → Email tab
5. Configure o email do tenant atual
6. Teste o envio de email

Se tudo funcionar, você pode executar a migration depois quando tiver tempo.

