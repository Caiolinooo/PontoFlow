# PontoFlow (Timesheet Manager)

Timesheet management system para colaboradores embarcados com fluxo de aprovação por gerente, prazos mensais com bloqueio e notificações bi‑idioma (pt‑BR/en‑GB). Projeto standalone com arquitetura preparada para integração futura ao Employee Hub.

## Principais recursos
- i18n completo (next-intl) com rotas localizadas `/[locale]/...` (pt‑BR padrão e en‑GB)
- Persistência da preferência de idioma em `profiles.locale`
- Autenticação e dados com Supabase (PostgreSQL + Auth + Storage)
- Fluxo de aprovação individual por gerente, com anotações por campo/entrada
- Notificações por e‑mail (envio, recusa com anotações, aprovado, lembretes de prazo, pendências do gerente)
- Cron de lembretes com cadência T‑7/T‑3/T‑1/T e suporte a “sem timesheet criado” e “recusados”
- Bloqueio visual e por RLS após o prazo mensal para o colaborador; gerente pode ajustar com aviso

## Stack
- Next.js 15 (App Router, RSC) + React 19 + TypeScript + Tailwind CSS
- next-intl para i18n
- Supabase (Postgres + Auth) com RLS
- Nodemailer para e‑mails

## Estrutura (parcial)
- `web/` aplicação Next.js
  - `src/app/[locale]/manager/...` UI de gerente (pendências, revisão)
  - `src/app/[locale]/employee/...` UI de colaborador (editor)
  - `src/app/api/...` endpoints (gerente, colaborador, cron, profile)
  - `src/lib/notifications/...` dispatcher e templates de e‑mail
  - `src/lib/supabase/...` clientes SSR e service role (server‑only)
  - `messages/{pt-BR|en-GB}/common.json` traduções
- `docs/db/schema-v1_1.sql` schema do banco

## i18n
- Locales suportados: `pt-BR` (padrão) e `en-GB`
- Preferência do usuário persistida em `profiles.locale`
- Middleware redireciona `/` → `/pt-BR`

## Variáveis de ambiente (web/.env.local)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_DEFAULT_LOCALE=pt-BR`
- `NEXT_PUBLIC_AVAILABLE_LOCALES=pt-BR,en-GB`
- SMTP (opcionais para e‑mail): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`
- Cron (server): `SUPABASE_SERVICE_ROLE_KEY` (NÃO público) e opcional `FORCE_CRON=true` para rodar fora da cadência
- Opcional: `NEXT_PUBLIC_BASE_URL` para compor links absolutos nos e‑mails

## Endpoints principais
- Gerente:
  - `GET /api/manager/pending-timesheets` → timesheets com `status='enviado'`
  - `GET /api/manager/timesheets/[id]` → detalhes + entries + annotations + approvals
  - `POST /api/manager/timesheets/[id]/approve`
  - `POST /api/manager/timesheets/[id]/reject` body: `{reason, annotations?}`
  - `POST /api/manager/timesheets/[id]/annotations` body: `{annotations}`
- Colaborador:
  - `GET /api/employee/timesheets/[id]`
  - `POST /api/employee/timesheets/[id]/entries`
  - `PATCH/DELETE /api/employee/timesheets/[id]/entries/[entryId]`
  - `POST /api/employee/timesheets/[id]/submit` → muda para `enviado` e notifica gerentes
- Perfil:
  - `POST /api/profile/locale` body: `{locale: 'pt-BR'|'en-GB'}`
- Cron:
  - `POST /api/cron/deadline-reminders` → lembretes T‑7/T‑3/T‑1/T (requer `SUPABASE_SERVICE_ROLE_KEY`)

## Fluxos de e‑mail
- timesheet_submitted → gerentes do(s) grupo(s)
- timesheet_rejected → colaborador (com motivo e anotações)
- timesheet_approved → colaborador
- deadline_reminder → colaborador (período pendente)
- manager_pending_reminder → gerente (lista consolidada)

Todos respeitam o locale do destinatário (pt‑BR/en‑GB).

## Rodando localmente
1. Configure `.env.local` em `web/`
2. Instale deps: `npm i`
3. Build: `npm run build`
4. Dev: `npm run dev`

## Observações de segurança
- NUNCA exponha `SUPABASE_SERVICE_ROLE_KEY` no cliente (`NEXT_PUBLIC_`).
- RLS no banco isola tenant e delegação de gerente por grupo. Os endpoints gerenciais dependem disso.

## Próximos passos sugeridos
- Padronizar layout corporativo de e‑mails (logo da sua marca, cabeçalho/rodapé, tom formal, i18n)
- Destaque visual das anotações por campo também na tela do gerente
- Edição inline das entradas no editor do colaborador
- Migrations automatizadas com Supabase CLI



## UI/UX atualizado (Meta)
- Cabeçalhos no estilo Meta (MetaPageHeader) com breadcrumbs opcionais
- Chip de acesso rápido ao Dashboard no Header (aparece apenas fora do Dashboard)
- AdminNav com TenantSwitcher integrado
- Remoção da antiga barra fixa de Voltar/Início; navegação centralizada no Header e breadcrumbs

## Boas práticas Next.js 15
- Páginas cliente sob `app/[locale]/...` que usam `params` passaram a tratar `params` como Promise e a usar `React.use(params)`
- Layouts de páginas protegidas passam o usuário carregado no servidor (`initialUser`) ao Header para evitar flicker

## Segurança
- `.env`, `.env.*` ignorados por padrão no Git; não comitar chaves sensíveis
- Service Role do Supabase só no servidor; nunca expor `SUPABASE_SERVICE_ROLE_KEY` no cliente

## Known Issues

### Database Schema
- **Missing `notification_preferences` table**: Sistema usa fallback com preferências padrão. Não afeta funcionalidade.
- **Missing `tenant_id` in delegation tables**: Performance de queries pode ser afetada em tenants com muitos grupos. Migração disponível em `docs/migrations/phase-22-add-tenant-to-delegations.sql`.

### Notifications
- **VAPID keys configuration**: Push notifications requerem configuração manual de VAPID keys. Documentação em `docs/NOTIFICATIONS-COMPLETE-FIX.md`.
- **SMTP configuration required**: Email notifications requerem configuração SMTP válida no `.env.local`.

### Performance
- **Redis dependency optional**: Cache service funciona sem Redis, mas performance pode ser melhorada com Redis configurado.

### UI/UX
- **Service Worker registration**: Push notifications podem requerer reload da página após primeira instalação do service worker.

---

## Changelog

### 0.2.8 (2025-10-31)
- **fix(build)**: Correção completa de lazy initialization para Netlify
  - ✅ Implementada lazy initialization em 5 arquivos adicionais de API routes
  - ✅ `/api/employee/audit/[auditId]/acknowledge/route.ts`
  - ✅ `/api/manager/timesheets/[id]/ack-status/route.ts`
  - ✅ `/api/manager/timesheets/[id]/route.ts`
  - ✅ `/api/employee/audit/pending/route.ts`
  - ✅ `/api/notifications/mark-read/route.ts`
  - ✅ Resolvido erro "Missing NEXT_PUBLIC_SUPABASE_URL" durante coleta de dados no Netlify
  - ✅ Todos os clientes Supabase agora são criados em runtime, não em build time

### 0.2.7 (2025-10-31)
- **fix(build)**: Correção de lazy initialization para Netlify
  - ✅ Implementada lazy initialization em 4 arquivos de API routes
  - ✅ `/api/admin/me/tenant/route.ts`
  - ✅ `/api/notifications/subscribe/route.ts`
  - ✅ `/api/notifications/unsubscribe/route.ts`
  - ✅ `/api/notifications/preferences/route.ts`
  - ✅ Resolvido erro "supabaseUrl is required" durante coleta de dados no Netlify

### 0.2.6 (2025-10-31)
- **feat(notifications)**: Sistema completo de notificações multi-canal
  - ✅ Notificações in-app com badge e modal
  - ✅ Notificações push no navegador (Web Push API)
  - ✅ Notificações por email via SMTP
  - ✅ Painel de teste completo com seleção de tipo e canal
  - ✅ Payloads realistas em português para todos os tipos
- **feat(notifications)**: Gerenciamento de subscrições push
  - ✅ Subscribe/unsubscribe funcional
  - ✅ Verificação de permissões do navegador
  - ✅ Persistência de subscrições no banco
  - ✅ Lógica manual de update/insert para compatibilidade
- **fix(notifications)**: Correção de schema mismatch
  - ✅ Tabela `notifications`: `read_at` (timestamp) ao invés de `read` (boolean)
  - ✅ Tabela `notifications`: Removido campo `event` inexistente
  - ✅ Tabela `notifications`: Adicionados campos `action_url` e `priority`
  - ✅ Tabela `push_subscriptions`: Removido campo `subscribed_at` inexistente
- **fix(notifications)**: Correção de constraint de push_subscriptions
  - ✅ Implementada lógica manual de verificação e update/insert
  - ✅ Endpoint DELETE para unsubscribe
  - ✅ Hook atualizado para usar método DELETE correto
- **feat(admin)**: Painel de teste de notificações reformulado
  - ✅ Seleção de tipo de notificação (Aprovada, Rejeitada, Lembrete, Enviada)
  - ✅ Checkboxes para escolher canais (Email e/ou Navegador)
  - ✅ Teste completo multi-canal simultâneo
  - ✅ Teste rápido de email para verificar SMTP
  - ✅ Feedback detalhado de sucesso/erro por canal
- **feat(admin)**: Configurações do tenant pré-preenchidas
  - ✅ Carregamento automático das configurações atuais
  - ✅ Campos pré-populados com dados existentes
  - ✅ Melhor UX para edição de configurações
- **fix(reports)**: Correção de permissões de relatórios para MANAGER
  - ✅ Manager sem grupos: vê apenas próprio relatório
  - ✅ Manager com grupos: vê relatórios dos colaboradores dos grupos
  - ✅ Lógica aplicada em generate e export
- **fix(timesheets)**: Correção de mapeamento de tipo de dia
  - ✅ "Folga" agora mapeia corretamente para "folga" (não "férias")
- **docs**: Documentação completa do sistema de notificações
  - ✅ `docs/NOTIFICATIONS-COMPLETE-FIX.md` - Guia completo
  - ✅ `docs/NOTIFICATIONS-FIX.md` - Correções aplicadas
  - ✅ `docs/REJECTED-TIMESHEET-NOTIFICATIONS.md` - Notificações de rejeição
  - ✅ `docs/REPORTS-PERMISSIONS-FIX.md` - Correção de permissões
  - ✅ `docs/ADMIN-SETTINGS-FIX.md` - Correção de configurações

### 0.2.5 (2025-10-30)
- **feat(timesheets)**: Sistema de notificações para timesheets rejeitados
  - ✅ Alerta visual no dashboard quando timesheet é rejeitado
  - ✅ Banner no timesheet com motivo da rejeição
  - ✅ Verificação automática de prazo para reenvio
  - ✅ Permissão de edição habilitada para timesheets rejeitados
  - ✅ Mensagens diferenciadas para dentro/fora do prazo
- **feat(i18n)**: Traduções completas PT/EN para notificações de rejeição
  - ✅ Mensagens de alerta traduzidas
  - ✅ Textos de banner traduzidos
  - ✅ Formatação de datas localizada
- **fix(auth)**: Correção de autenticação com fallback para users_unified
  - ✅ getUserFromToken agora verifica Supabase Auth e users_unified
  - ✅ Sessões validadas corretamente para usuários importados
  - ✅ Logs detalhados para debug de autenticação

### 0.2.4 (2025-10-27)
- **fix(notifications)**: API agora retorna preferências padrão quando tabela não existe (erro 500 corrigido)
- **fix(i18n)**: Traduções completas da página de notificações em pt-BR
- **fix(layout)**: Correção completa do layout responsivo
  - Removido DeveloperFooter duplicado de todos os layouts
  - Ajustado padding inferior em todos os módulos (dashboard: 160px, outros: 96px)
  - Todo conteúdo agora visível sem cortes pelo footer fixo
  - Cards Admin e Settings totalmente visíveis no dashboard
- **chore(architecture)**: Simplificação da estrutura de footer (DeveloperFooter integrado no UnifiedBottomNav)

### 0.2.3 (2025-10-27)
- **fix(developer-info)**: Correção de todas as informações de contato do desenvolvedor
  - Instagram: @tal_do_goulart
  - LinkedIn: https://www.linkedin.com/in/caio-goulart/
  - Email: Caiovaleriogoulartcorreia@gmail.com
- **feat(dashboard)**: Estatísticas baseadas em role do usuário
  - Admin/Manager: Horas este mês, Aprovados, Pendentes
  - Employee (Offshore): Horas este mês, Horas Extras (50%), Dobra (100%)
  - Conformidade com regulamentações offshore (CLT Art. 74, Portaria MTP 671/2021)
- **feat(footer)**: Footer do desenvolvedor integrado na barra de navegação inferior
  - Visível apenas no dashboard
  - Design compacto com todas as informações
- **feat(cards)**: Estilo premium aplicado a todos os cards do dashboard
  - Backgrounds com gradiente
  - Múltiplos efeitos de hover (elevação, sombras, rotação de ícones)
  - Transições suaves (300-700ms)

### 0.2.2 (2025-10-27)
- **feat(footer)**: Footer profissional com informações do desenvolvedor
  - Copyright com ano atual
  - Nome, email e links sociais (GitHub, LinkedIn, Instagram)
  - Design responsivo e elegante
  - Integrado em todos os layouts
- **feat(navigation)**: Botão "Voltar ao Dashboard"
  - Ícone de seta com animação suave
  - Design inspirado no Meta UI
  - Oculto automaticamente na página do dashboard
  - Adicionado a todos os layouts não-admin
- **feat(branding)**: Upload de imagens para branding
  - Upload de logo e watermark
  - Codificação Base64 para armazenamento
  - Preview ao vivo das imagens
  - Suporte para URL ou arquivo
  - Integrado em AdminTenantSettings
- **feat(dashboard)**: Dashboard aprimorado com header gradiente
  - Cards de estatísticas rápidas
  - Múltiplos efeitos de hover
  - Backdrop blur e sombras aprimoradas
- **fix(layout)**: Posicionamento da navegação inferior corrigido
  - Layout flex-col para posicionamento correto do footer
  - Padding consistente (pb-20) para espaço da navegação
  - Footer do desenvolvedor acima da navegação inferior

### 0.2.1 (2025-10-27)
- **feat(navigation)**: Barra de navegação inferior unificada
  - Consolidação de toda navegação em uma única barra inferior
  - Logo + título do site à esquerda
  - Menus admin (quando em rotas /admin) com dropdowns
  - Toggle de tema, seletor de idioma, info do usuário à direita
  - Seletor de tenant (apenas admin)
  - Design responsivo para mobile e desktop
- **feat(context-aware)**: Navegação consciente do contexto
  - Menus admin aparecem apenas em rotas `/admin`
  - Barra limpa para rotas employee, manager, dashboard
  - Dropdowns abrem para cima a partir da barra inferior
  - Destaque de categoria ativa
- **refactor(ui)**: Remoção de componentes de navegação duplicados
  - Removido Header e AdminNav dos layouts
  - Interface mais limpa com fonte única de navegação
  - Melhor uso do espaço da tela
  - Experiência consistente em todos os módulos
- **chore(layouts)**: Todos os layouts agora usam UnifiedBottomNav
  - Adicionado padding `pb-16` para evitar sobreposição de conteúdo
  - TenantSwitcher integrado na barra inferior

### 0.2.0 (2025-10-27)
- **BREAKING**: Reestruturação completa da página de configurações com interface em abas
- **BREAKING**: Remoção de todos os emojis para aparência comercial profissional
- **BREAKING**: Configuração de sincronização genérica (removidas referências específicas ao EmployeeHub)
  - `EMPLOYEEHUB_SYNC_URL` → `SOURCE_SYSTEM_SYNC_URL`
  - `TIMESHEET_SYNC_URL` → `TARGET_SYSTEM_SYNC_URL`
- **feat(settings)**: Interface de configurações em abas com 3 seções principais
  - Status do Sistema: Health check com badges visuais de status
  - Configurações do Sistema: Config do sistema com ferramentas de migração
  - Configurações da Empresa: Configurações do tenant
- **feat(health)**: Sistema de health check aprimorado
  - Badges visuais de status para cada componente
  - Indicador de saúde geral do sistema
  - Verificações adicionais de variáveis de ambiente (SMTP, Sync, API)
  - Mensagens de erro e avisos melhoradas
  - Melhor organização visual com cards
- **feat(migration)**: Funcionalidade de migração integrada
  - Exportar usuários do sistema atual
  - Importar usuários de sistemas externos
  - Testar conexões antes da migração
  - Autenticação HMAC SHA-256
  - Download JSON para exportações
  - Feedback detalhado de operações
- **refactor(ui)**: Melhorias profissionais de UI
  - Removidos todos os ícones emoji
  - Design corporativo limpo
  - Melhor hierarquia visual
  - Espaçamento e tipografia consistentes
  - Badges de status e feedback com código de cores
- **refactor(components)**: Separação de responsabilidades em componentes dedicados
  - AdminSettingsTabs: Interface principal em abas
  - AdminTenantSettings: Configuração da empresa
  - AdminSystemConfig: Variáveis do sistema e integrações
  - AdminHealth: Monitoramento de saúde aprimorado
- **chore**: Removido componente AdminDataSync (integrado no AdminSystemConfig)

### 0.1.6 (2025-10-24)
- chore(brand): limpeza final de quaisquer ocorrências "ABZ" (UI, e‑mails, invoice)
- fix(dashboard): texto corrompido corrigido; cores via `[var(--primary)]`
- fix(tests): ajustes nos seletores dos formulários de Auth e expectativas dos templates de e‑mail; suíte verde
- build: type-check e build de produção passando

### 0.1.5 (2025-10-24)
- fix(ts): Next 15 compat (await headers, searchParams em Admin/Users)
- fix(audit): adiciona actions `manager_edit_closed_period` e `employee_acknowledge_adjustment`
- fix(notifications): payloads agora aceitam `tenantId` opcional para branding por tenant
- fix(api): health route com tipos seguros e mask de env nulos; associações de tenants com `.select('id')` e formato null-safe
- fix(manager): tipos explícitos nos mapeamentos de entries
- fix(pdf): resposta `Blob` e import dinâmico de `puppeteer` com fallback para manter build verde sem dependência opcional
- build: `npm run type-check` e `npm run build` passando

### 0.1.4 (2025-10-24)
- chore(brand): Remoção de qualquer referência ABZ; branding padrão alterado para PontoFlow
- chore(assets): Substituído logo padrão para `/brand/logo.svg`; removido `public/logo-abz.png`
- fix(admin/layout): Header sem flicker (passa `initialUser`); AdminNav recebe `locale` corretamente
- chore(auth): Gradiente de fundo genérico (blue→indigo) nas telas de Auth
- docs: README e LICENSE-COMMERCIAL atualizados; `.env.example` com MAIL_FROM do PontoFlow

### 0.1.3 (2025-10-23)
- feat(ui): Cabeçalhos Meta com breadcrumbs opcionais (Delegações, Funcionários, Edição de Grupo)
- feat(nav): Chip “Dashboard” no Header (estilo Meta), removendo barra antiga de Voltar/Início
- fix(header): Evita flicker ao navegar (Header recebe `initialUser` pelo servidor em Dashboard, Employee, Manager, Reports e Settings)
- fix(admin/delegations): Mensagens de erro mais claras ao abrir Grupo (exibe tenant_required, forbidden, etc.)
- chore: `.gitignore` já ignora `.env*`; sem dados sensíveis nos commits
- docs: README atualizado e adicionado LICENSE-COMMERCIAL.md

### 0.1.2
- Primeira versão pública do módulo web standalone
