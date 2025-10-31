# Correção: Configurações da Empresa não Apareciam Preenchidas

## 📋 Problema Identificado

Quando o admin acessava a página de configurações da empresa (`/admin/settings`), os campos apareciam **vazios** mesmo com dados já salvos no banco de dados.

### Causa Raiz

A página `web/src/app/[locale]/admin/settings/page.tsx` estava tentando buscar o `tenant_id` do usuário através de:

```typescript
const { data: tenant } = await supabase
  .from('tenants')
  .select('...')
  .eq('id', (await supabase.auth.getUser()).data.user?.user_metadata?.tenant_id)
  .maybeSingle();
```

**Problema:** Usuários na tabela `users_unified` (como Karla Ramos e outros importados) **não existem no Supabase Auth**, então `supabase.auth.getUser()` retorna `null`, fazendo com que a query não encontre o tenant.

---

## ✅ Solução Implementada

### 1. Usar `requireRole` para Obter o Usuário Correto

A função `requireRole` já tem toda a lógica de fallback para buscar usuários tanto no Supabase Auth quanto na tabela `users_unified`.

**Antes:**
```typescript
export default async function AdminSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  await requireRole(locale, ['ADMIN']); // ❌ Não capturava o retorno

  const supabase = await getServerSupabase();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('...')
    .eq('id', (await supabase.auth.getUser()).data.user?.user_metadata?.tenant_id) // ❌ Sempre null
    .maybeSingle();
```

**Depois:**
```typescript
export default async function AdminSettingsPage(props: { params: Promise<{ locale: string }> }) {
  const { locale } = await props.params;
  const user = await requireRole(locale, ['ADMIN']); // ✅ Captura o usuário

  const supabase = await getServerSupabase();

  const { data: tenant } = await supabase
    .from('tenants')
    .select('...')
    .eq('id', user.tenant_id) // ✅ Usa o tenant_id correto
    .maybeSingle();

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('*')
    .eq('tenant_id', user.tenant_id) // ✅ Usa o tenant_id correto
    .maybeSingle();
```

### 2. Adicionar Logging para Debugging

Adicionei logs para facilitar o debugging:

```typescript
console.log('[ADMIN SETTINGS] User tenant_id:', user.tenant_id);
console.log('[ADMIN SETTINGS] Tenant:', tenant);
console.log('[ADMIN SETTINGS] Settings:', settings);
console.log('[ADMIN SETTINGS] Merged settings:', mergedSettings);
```

---

## 📊 Dados Verificados no Banco

Executei o script `web/check-tenant-settings.mjs` e confirmei que os dados **JÁ EXISTEM** no banco:

```
✅ Configurações encontradas:
   - Company Name: ABZ SERVICOS LTDA
   - Legal Name: AGUAS BRASILEIRAS SERVICOS E CONSULTORIAS EM ATIVIDADES MARITIMAS LTDA
   - Document:  17.784.306/0001-89
   - Email: contato@groupabz.com
   - Website: https://www.groupabz.com
   - Address Line 1: AV NOSSA SENHORA DA GLORIA
   - City: Macae
   - State: RJ
   - Postal Code: 27.920-360
   - Country: Brasil
   - Deadline Day: 15
```

---

## 🧪 Como Testar

1. **Acesse a página de configurações:**
   - URL: `http://localhost:3000/pt-BR/admin/settings`
   - Login: `caio.correia@groupabz.com` (ou qualquer admin)

2. **Verifique a aba "Configurações da Empresa":**
   - ✅ Nome Fantasia deve mostrar: "ABZ SERVICOS LTDA"
   - ✅ Razão Social deve mostrar: "AGUAS BRASILEIRAS SERVICOS E CONSULTORIAS EM ATIVIDADES MARITIMAS LTDA"
   - ✅ CNPJ/Documento deve mostrar: " 17.784.306/0001-89"
   - ✅ E-mail deve mostrar: "contato@groupabz.com"
   - ✅ Site deve mostrar: "https://www.groupabz.com"
   - ✅ Endereço (linha 1) deve mostrar: "AV NOSSA SENHORA DA GLORIA"
   - ✅ Cidade deve mostrar: "Macae"
   - ✅ Estado deve mostrar: "RJ"
   - ✅ CEP deve mostrar: "27.920-360"
   - ✅ País deve mostrar: "Brasil"

3. **Verifique os logs do servidor:**
   - Deve aparecer: `[ADMIN SETTINGS] Settings: { company_name: 'ABZ SERVICOS LTDA', ... }`

---

## 📁 Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `web/src/app/[locale]/admin/settings/page.tsx` | Captura retorno de `requireRole` e usa `user.tenant_id` |
| `web/src/components/admin/AdminTenantSettings.tsx` | Revertido para versão original (sem badges) |

---

## 🔍 Arquivos de Diagnóstico Criados

| Arquivo | Propósito |
|---------|-----------|
| `web/check-tenant-settings.mjs` | Verifica dados salvos no banco |
| `web/check-push-subscriptions.mjs` | Verifica tabela de notificações push |

---

## ✅ Status

- [x] Problema identificado
- [x] Solução implementada
- [x] Dados verificados no banco
- [x] Logs adicionados
- [x] Servidor reiniciado
- [ ] Teste manual pelo usuário

---

## 📝 Observações

1. **Componente AdminTenantSettings já estava correto:**
   - Usa `defaultValue={settings?.campo ?? ''}` para preencher os campos
   - Não precisou de modificação

2. **API `/api/admin/settings` já estava correta:**
   - Salva e busca dados corretamente
   - Suporta upsert por `tenant_id`

3. **O problema era apenas na página:**
   - Não estava buscando o `tenant_id` correto
   - Afetava apenas usuários da tabela `users_unified`

---

**Data:** 2025-10-31  
**Autor:** Augment Agent  
**Status:** ✅ RESOLVIDO

