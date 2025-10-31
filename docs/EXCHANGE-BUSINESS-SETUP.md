# 📧 Configuração do Exchange Business para PontoFlow

**Data**: 2025-10-27  
**Versão**: 1.0.0

---

## 🎯 VISÃO GERAL

O PontoFlow suporta **Exchange Business (Microsoft 365)** através de **SMTP autenticado**. Este guia mostra como configurar o envio de emails usando sua conta corporativa do Exchange.

---

## ✅ MÉTODO 1: SMTP com Senha (Mais Simples)

### Passo 1: Habilitar SMTP AUTH no Microsoft 365

1. Acesse o **Microsoft 365 Admin Center**
   - URL: https://admin.microsoft.com

2. Vá em **Settings** > **Org settings** > **Mail**

3. Procure por **SMTP AUTH** e certifique-se de que está **habilitado**

4. Se não estiver habilitado:
   - Clique em **SMTP AUTH**
   - Marque a opção **"Enable SMTP AUTH"**
   - Salve as alterações

### Passo 2: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `web/.env.local`:

```env
# Exchange Business SMTP
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=seu-email@empresa.com
SMTP_PASS=sua-senha-corporativa
MAIL_FROM="PontoFlow - ABZ Group <seu-email@empresa.com>"
```

### Passo 3: Testar Configuração

1. Reinicie o servidor de desenvolvimento:
```bash
cd web
npm run dev
```

2. Acesse o painel de testes:
```
http://localhost:3000/pt-BR/admin/settings/notifications-test
```

3. Envie um email de teste para verificar se está funcionando

---

## 🔐 MÉTODO 2: SMTP com App Password (Mais Seguro)

Se sua organização exige **autenticação multifator (MFA)**, você precisará criar um **App Password**.

### Passo 1: Criar App Password

1. Acesse **https://account.microsoft.com/security**

2. Vá em **Advanced security options**

3. Procure por **App passwords**

4. Clique em **Create a new app password**

5. Copie a senha gerada (ela será mostrada apenas uma vez)

### Passo 2: Configurar com App Password

```env
# Exchange Business com App Password
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=seu-email@empresa.com
SMTP_PASS=xxxx-xxxx-xxxx-xxxx  # App Password gerada
MAIL_FROM="PontoFlow - ABZ Group <seu-email@empresa.com>"
```

---

## 🎛️ CONFIGURAÇÃO VIA PAINEL ADMIN

### Opção 1: Via Interface Web (Desenvolvimento)

1. Acesse: `http://localhost:3000/pt-BR/admin/settings`

2. Vá na aba **"Configuração de E-mail"**

3. Selecione **"SMTP Genérico"** como provedor

4. Preencha os campos:
   - **SMTP_HOST**: `smtp.office365.com`
   - **SMTP_PORT**: `587`
   - **SMTP_USER**: `seu-email@empresa.com`
   - **SMTP_PASS**: Sua senha ou App Password
   - **MAIL_FROM**: `"PontoFlow <seu-email@empresa.com>"`

5. Clique em **"Salvar Configurações"**

6. **IMPORTANTE**: Reinicie o servidor para aplicar as mudanças

### Opção 2: Via Variáveis de Ambiente (Produção)

Em produção (Vercel, Render, etc.), configure as variáveis de ambiente no painel do provedor:

**Vercel:**
1. Acesse o projeto no Vercel Dashboard
2. Vá em **Settings** > **Environment Variables**
3. Adicione as variáveis acima
4. Faça um novo deploy

**Render:**
1. Acesse o serviço no Render Dashboard
2. Vá em **Environment**
3. Adicione as variáveis acima
4. O serviço será reiniciado automaticamente

---

## 🧪 TESTANDO A CONFIGURAÇÃO

### Teste 1: Via Painel Admin

1. Acesse: `/pt-BR/admin/settings/notifications-test`

2. Preencha:
   - **Email de destino**: Seu email pessoal
   - **Tipo de notificação**: Qualquer um

3. Clique em **"Enviar Teste"**

4. Verifique:
   - ✅ Mensagem de sucesso no painel
   - ✅ Email recebido na caixa de entrada
   - ✅ Remetente correto
   - ✅ Formatação correta

### Teste 2: Via Fluxo Real

1. Crie um timesheet como colaborador

2. Submeta para aprovação

3. Verifique se o gerente recebeu o email

---

## ⚠️ TROUBLESHOOTING

### Erro: "Authentication failed"

**Causa**: Credenciais incorretas ou SMTP AUTH desabilitado

**Solução**:
1. Verifique se o email e senha estão corretos
2. Confirme que SMTP AUTH está habilitado no Microsoft 365
3. Se usar MFA, crie um App Password

### Erro: "Connection timeout"

**Causa**: Firewall bloqueando porta 587

**Solução**:
1. Verifique se a porta 587 está aberta
2. Tente usar porta 25 (menos comum)
3. Verifique configurações de firewall da rede

### Erro: "Relay access denied"

**Causa**: Exchange não permite relay de emails

**Solução**:
1. Certifique-se de que está usando o email correto em `SMTP_USER`
2. O email em `MAIL_FROM` deve ser o mesmo de `SMTP_USER`
3. Verifique políticas de relay no Exchange

### Emails vão para SPAM

**Causa**: Falta de configuração SPF/DKIM

**Solução**:
1. Configure SPF record no DNS:
```
v=spf1 include:spf.protection.outlook.com ~all
```

2. Configure DKIM no Microsoft 365:
   - Admin Center > Exchange > Protection > DKIM
   - Habilite DKIM para seu domínio

3. Configure DMARC no DNS:
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@empresa.com
```

---

## 🔄 ALTERNATIVAS AO SMTP

### Opção 1: Microsoft Graph API (Futuro)

**Vantagens:**
- ✅ Mais seguro (OAuth2)
- ✅ Não requer senha
- ✅ Melhor controle de permissões

**Desvantagens:**
- ❌ Mais complexo de configurar
- ❌ Requer registro de app no Azure AD
- ❌ **NÃO IMPLEMENTADO** no PontoFlow

**Implementação Futura:**
```typescript
// Exemplo de como seria (não implementado)
import { Client } from '@microsoft/microsoft-graph-client';

const client = Client.init({
  authProvider: (done) => {
    done(null, accessToken);
  }
});

await client.api('/me/sendMail').post({
  message: {
    subject: 'Test',
    body: { contentType: 'HTML', content: html },
    toRecipients: [{ emailAddress: { address: to } }]
  }
});
```

### Opção 2: SendGrid (Recomendado para Produção)

**Vantagens:**
- ✅ Mais confiável
- ✅ Métricas de entrega
- ✅ Melhor deliverability
- ✅ Suporte a templates

**Configuração:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxxxxxxxxxxxxxxxxxxxx
MAIL_FROM="PontoFlow <noreply@empresa.com>"
```

### Opção 3: Amazon SES

**Vantagens:**
- ✅ Baixo custo
- ✅ Alta escalabilidade
- ✅ Integração com AWS

**Configuração:**
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=AKIAIOSFODNN7EXAMPLE
SMTP_PASS=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
MAIL_FROM="PontoFlow <noreply@empresa.com>"
```

---

## 📊 COMPARAÇÃO DE MÉTODOS

| Método | Facilidade | Segurança | Custo | Recomendado Para |
|--------|-----------|-----------|-------|------------------|
| Exchange SMTP | ⭐⭐⭐⭐ | ⭐⭐⭐ | Grátis | Desenvolvimento, pequenas empresas |
| Exchange OAuth2 | ⭐⭐ | ⭐⭐⭐⭐⭐ | Grátis | Empresas com alta segurança |
| SendGrid | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Pago | Produção, médias/grandes empresas |
| Amazon SES | ⭐⭐⭐ | ⭐⭐⭐⭐ | Baixo | Produção, alta escala |

---

## ✅ CHECKLIST DE CONFIGURAÇÃO

### Antes de Começar
- [ ] Tenho acesso ao Microsoft 365 Admin Center
- [ ] SMTP AUTH está habilitado
- [ ] Tenho credenciais válidas (email + senha ou App Password)

### Configuração
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor reiniciado
- [ ] Teste de email enviado com sucesso
- [ ] Email recebido na caixa de entrada
- [ ] Formatação do email está correta

### Produção
- [ ] SPF configurado no DNS
- [ ] DKIM habilitado no Microsoft 365
- [ ] DMARC configurado no DNS
- [ ] Variáveis de ambiente configuradas no provedor
- [ ] Testes em produção realizados

---

## 📞 SUPORTE

Se você encontrar problemas:

1. **Verifique os logs do servidor**:
```bash
# No terminal onde o servidor está rodando
# Procure por mensagens como:
[email-service] Email disabled: missing credentials
[email-service] Email sent successfully to: email@example.com
```

2. **Teste as credenciais manualmente**:
```bash
# Use telnet para testar conexão SMTP
telnet smtp.office365.com 587
```

3. **Consulte a documentação**:
   - Microsoft 365 SMTP: https://learn.microsoft.com/en-us/exchange/mail-flow-best-practices/how-to-set-up-a-multifunction-device-or-application-to-send-email-using-microsoft-365-or-office-365
   - Nodemailer: https://nodemailer.com/smtp/

4. **Contate o suporte**:
   - Abra uma issue no repositório
   - Inclua os logs (sem expor credenciais)

---

## 🎉 CONCLUSÃO

O PontoFlow está **pronto para usar Exchange Business** através de SMTP. A configuração é simples e funciona imediatamente após configurar as variáveis de ambiente.

**Próximos passos:**
1. Configure as variáveis de ambiente
2. Reinicie o servidor
3. Teste o envio de emails
4. Configure SPF/DKIM para produção

**Boa sorte! 🚀**


