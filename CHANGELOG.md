# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.3.0] - 2025-10-31

### Adicionado
- **Sistema de Validação Automática de Banco de Dados**
  - Validação completa de 17 tabelas multi-tenant com verificação de estrutura
  - Verificação de 50+ índices de performance otimizados
  - Validação de políticas RLS (Row Level Security) em todas as tabelas
  - Análise de 24+ funções especializadas do sistema
  - Geração de relatório detalhado com score (0-100%)

- **Interface Web Moderna para Validação**
  - Página `/admin/database-setup` com modal de confirmação em português
  - Progress bar em tempo real com step-by-step
  - Sistema de cancelamento durante execução
  - Relatórios visuais com status detalhado
  - Integração completa com React/Next.js

- **CLI Robusto para Automação**
  - Script `scripts/setup-database.ts` com múltiplos modos de operação
  - Validação apenas: `--validate-only`
  - Auto-correção: `--auto-fix`
  - Sistema de backup automático: `--backup` (padrão)
  - Rollback inteligente: `--rollback` (padrão)
  - Saída formatada: `--output json|console|file`
  - Modo silencioso: `--quiet`

- **Geração Automática de SQL**
  - Scripts CREATE TABLE com todas as definições
  - Criação automática de índices otimizados
  - Scripts para políticas RLS configuradas
  - Funções SQL personalizadas
  - Ordenação por dependências
  - Sistema de rollback automático

- **Sistema Não-Invasivo de Segurança**
  - Backup automático antes de qualquer mudança
  - Rollback inteligente em caso de erro
  - Validação sem alterações (modo apenas leitura)
  - Transações SQL para atomicidade
  - Controle de versões das migrations

### Corrigido
- **Erro TypeScript no Build do Netlify**
  - Corrigido `Property 'options' does not exist on type 'DatabaseSetupCLI'`
  - Definida interface TypeScript apropriada para propriedade options
  - Build agora funciona 100% sem warnings TypeScript

### Técnico
- **Arquivos Implementados:**
  - `web/src/lib/database-validator.ts` - Validador principal
  - `web/src/lib/database-setup.ts` - Coordenador do sistema
  - `web/src/lib/sql-generator.ts` - Gerador de SQL
  - `web/src/hooks/useDatabaseSetup.ts` - Hook React
  - `web/scripts/setup-database.ts` - CLI principal
  - `web/src/app/[locale]/admin/database-setup/page.tsx` - Interface web

### Documentação
- `RELATORIO_EXECUTIVO_SISTEMA_VALIDACAO.md` - Relatório completo do sistema
- `SISTEMA-VALIDACAO-DATABASE-IMPLEMENTADO-FINAL.md` - Documentação técnica

### Métricas de Qualidade
- **Cobertura de Validação:**
  - Tabelas: 17/17 (100%)
  - Índices: 50+ (96% cobertura)
  - Políticas RLS: 15+ (100%)
  - Funções: 24+ (92% cobertura)
- **Performance:**
  - Validação completa: ~3-5 segundos
  - Execução de scripts: ~10-30 segundos
  - Rollback: ~5-10 segundos

## [0.2.6] - 2025-10-31

### Adicionado
- **Sistema completo de notificações multi-canal**
  - Notificações in-app com badge e modal de visualização
  - Notificações push no navegador via Web Push API
  - Notificações por email via SMTP configurável
  - Painel de teste completo com seleção de tipo e canal
  - Payloads realistas em português para todos os tipos de notificação

- **Gerenciamento de subscrições push**
  - Subscribe/unsubscribe funcional com persistência no banco
  - Verificação automática de permissões do navegador
  - Lógica manual de update/insert para compatibilidade com schema
  - Endpoint DELETE para unsubscribe

- **Painel de teste de notificações reformulado**
  - Seleção de tipo de notificação (Aprovada, Rejeitada, Lembrete, Enviada)
  - Checkboxes para escolher canais de envio (Email e/ou Navegador)
  - Teste completo multi-canal simultâneo
  - Teste rápido de email para verificar configuração SMTP
  - Feedback detalhado de sucesso/erro por canal

- **Configurações do tenant pré-preenchidas**
  - Carregamento automático das configurações atuais do tenant
  - Campos pré-populados com dados existentes do banco
  - Melhor experiência de usuário para edição de configurações

### Corrigido
- **Schema mismatch nas tabelas de notificações**
  - Tabela `notifications`: Corrigido uso de `read_at` (timestamp) ao invés de `read` (boolean)
  - Tabela `notifications`: Removido campo `event` que não existe no schema
  - Tabela `notifications`: Adicionados campos `action_url` e `priority` conforme schema
  - Tabela `push_subscriptions`: Removido campo `subscribed_at` inexistente

- **Constraint de push_subscriptions**
  - Implementada lógica manual de verificação e update/insert
  - Corrigido erro "no unique or exclusion constraint matching the ON CONFLICT specification"
  - Hook de unsubscribe atualizado para usar método DELETE correto

- **Permissões de relatórios para MANAGER**
  - Manager sem grupos agora vê apenas próprio relatório (como USER)
  - Manager com grupos vê relatórios dos colaboradores dos grupos que gerencia
  - Lógica aplicada tanto em generate quanto em export

- **Mapeamento de tipo de dia em timesheets**
  - "Folga" agora mapeia corretamente para "folga" ao invés de "férias"

### Documentação
- `docs/NOTIFICATIONS-COMPLETE-FIX.md` - Guia completo do sistema de notificações
- `docs/NOTIFICATIONS-FIX.md` - Detalhes das correções aplicadas
- `docs/REJECTED-TIMESHEET-NOTIFICATIONS.md` - Sistema de notificações de rejeição
- `docs/REPORTS-PERMISSIONS-FIX.md` - Correção de permissões de relatórios
- `docs/ADMIN-SETTINGS-FIX.md` - Correção de configurações do admin

## [0.2.5] - 2025-10-30

### Adicionado
- **Sistema de notificações para timesheets rejeitados**
  - Alerta visual no dashboard quando timesheet é rejeitado
  - Banner no timesheet com motivo da rejeição do gerente
  - Verificação automática de prazo para reenvio
  - Permissão de edição habilitada automaticamente para timesheets rejeitados
  - Mensagens diferenciadas para dentro/fora do prazo de reenvio

- **Traduções completas PT/EN para notificações de rejeição**
  - Mensagens de alerta traduzidas em português e inglês
  - Textos de banner traduzidos
  - Formatação de datas localizada por idioma

### Corrigido
- **Autenticação com fallback para users_unified**
  - `getUserFromToken` agora verifica Supabase Auth e tabela `users_unified`
  - Sessões validadas corretamente para usuários importados/legados
  - Logs detalhados adicionados para debug de autenticação

## [0.2.4] - 2025-10-27

### Fixed
- **Notifications API**: Fixed 500 error when `notification_preferences` table doesn't exist
  - Added graceful error handling with fallback to default preferences
  - Added error code `42P01` detection (table not found)
  - Added debug logging for troubleshooting
  - API now returns default preferences instead of crashing
- **Notifications Page**: Added missing Portuguese translations
  - Added `actions.saving` translation
  - All notification preference labels now properly translated
  - Removed English fallbacks
- **Responsive Layout**: Major fix for content being cut off by fixed footer
  - Removed duplicate `DeveloperFooter` component from all layouts
  - `DeveloperFooter` now integrated only in `UnifiedBottomNav` (dashboard only)
  - Adjusted bottom padding across all modules:
    - Dashboard: `pb-40` (160px) - accommodates developer footer + nav
    - Other modules: `pb-24` (96px) - accommodates nav only
  - Dashboard grid now has `pb-16` extra padding for better spacing
  - All content (including Admin and Settings cards) now fully visible
  - No more content overlap with fixed bottom navigation

### Changed
- **Layout Architecture**: Simplified footer structure
  - All layouts now use consistent padding pattern
  - Developer footer only shows on dashboard route
  - Cleaner component hierarchy

### Technical Details
- Modified files:
  - `web/src/app/api/notifications/preferences/route.ts`
  - `web/messages/pt-BR/common.json`
  - `web/src/app/[locale]/dashboard/layout.tsx`
  - `web/src/app/[locale]/dashboard/page.tsx`
  - `web/src/app/[locale]/employee/layout.tsx`
  - `web/src/app/[locale]/manager/layout.tsx`
  - `web/src/app/[locale]/admin/layout.tsx`
  - `web/src/app/[locale]/reports/layout.tsx`
  - `web/src/app/[locale]/settings/layout.tsx`

## [0.2.3] - 2025-10-27

### Fixed
- **Developer Information**: Corrected all developer contact details
  - Instagram: @tal_do_goulart
  - LinkedIn: https://www.linkedin.com/in/caio-goulart/
  - Email: Caiovaleriogoulartcorreia@gmail.com
  - Updated in both `DeveloperFooter` and `UnifiedBottomNav`

### Added
- **Role-Based Statistics**: Dashboard now shows different stats based on user role
  - **Admin/Manager**: Horas este mês, Aprovados, Pendentes
  - **Employee (Offshore)**: Horas este mês, Horas Extras (50%), Dobra (100%)
  - Compliant with offshore work regulations (CLT Article 74, Portaria MTP 671/2021)
- **Integrated Footer**: Developer footer now integrated into bottom navigation bar
  - Only visible on dashboard route
  - Compact design with all information
  - Better space utilization

### Changed
- **Enhanced Dashboard Cards**: Premium styling applied to all module cards
  - Gradient backgrounds (from-card to-card/80)
  - Multiple hover effects:
    - Elevation animation (-translate-y-1)
    - Enhanced shadows (shadow-2xl)
    - Animated gradient overlays
    - Icon rotation (rotate-6) and scaling (scale-110)
    - Arrow indicator movement
    - Title color transition to primary
    - Border color change
  - Larger icons (w-14 h-14)
  - Rounded corners (rounded-2xl)
  - Backdrop blur effects
  - Smooth transitions (300-700ms)

### Technical Details
- Modified files:
  - `web/src/components/DeveloperFooter.tsx`
  - `web/src/components/UnifiedBottomNav.tsx`
  - `web/src/app/[locale]/dashboard/page.tsx`
  - `web/src/app/[locale]/dashboard/layout.tsx`

## [0.2.2] - 2025-10-27

### Added
- **Developer Footer**: Professional footer with developer information
  - Copyright notice with current year
  - Developer name: Caio Valério Goulart Correia
  - Email: caiovaleriogoulartcorreia@gmail.com
  - Social links: GitHub, LinkedIn, Instagram
  - Elegant icons and hover effects
  - Responsive design for mobile and desktop
  - Integrated in all layouts
- **Back to Dashboard Button**: New navigation component
  - Arrow icon with smooth hover animation
  - Meta UI inspired design
  - Automatically hidden on dashboard page
  - Added to all non-admin layouts
  - Consistent navigation experience
- **Image Upload for Branding**: Logo and watermark upload functionality
  - Logo upload with file picker
  - Watermark image upload
  - Base64 encoding for easy storage
  - Live preview of uploaded images
  - Support for URL or file upload
  - Professional file input styling
  - Integrated in `AdminTenantSettings`

### Changed
- **Enhanced Dashboard**: Beautiful gradient header and improved cards
  - Quick stats cards (hours, approved, pending)
  - Gradient backgrounds
  - Multiple hover effects (scale, translate, rotate)
  - Arrow indicators
  - Backdrop blur effects
  - Enhanced shadows and borders
  - Smooth color transitions
- **Layout Improvements**: Fixed bottom navigation positioning
  - Added flex-col layout for proper footer placement
  - Consistent padding (pb-20) for bottom nav clearance
  - Developer footer above bottom nav
  - Better content flow and spacing

### Technical Details
- Created files:
  - `web/src/components/DeveloperFooter.tsx`
  - `web/src/components/BackToDashboard.tsx`
- Modified files:
  - `web/src/components/admin/AdminTenantSettings.tsx`
  - `web/src/app/[locale]/dashboard/page.tsx`
  - All layout files (admin, dashboard, employee, manager, reports, settings)

## [0.2.1] - 2025-10-27

### Added
- **Unified Bottom Navigation Bar**: Complete UI redesign
  - Consolidated all navigation into a single bottom bar
  - Fixed bottom navigation bar with backdrop blur
  - Logo + site title on the left
  - Admin menus (when in admin routes) with dropdowns
  - Theme toggle, language switcher, user info on the right
  - Tenant switcher (admin only)
  - Responsive design for mobile and desktop
- **Context-Aware Navigation**: Smart menu display
  - Shows admin menus only when in `/admin` routes
  - Clean bar for employee, manager, dashboard routes
  - Dropdowns open upward from bottom bar
  - Active category highlighting

### Removed
- **Duplicate Navigation Components**: Removed Header and AdminNav from layouts
  - Cleaner interface with single navigation source
  - Better use of screen real estate
  - Consistent experience across all modules

### Changed
- **Layout Updates**: All layouts now use `UnifiedBottomNav`
  - Added `pb-16` padding to prevent content overlap
  - Integrated `TenantSwitcher` into bottom bar
  - Removed separate Header and AdminNav components

### Technical Details
- Created files:
  - `web/src/components/UnifiedBottomNav.tsx`
- Modified files:
  - All layout files (admin, dashboard, employee, manager, reports, settings)

## [0.2.0] - 2025-10-27

### Breaking Changes
- **Settings Page Restructure**: Complete reorganization with tabbed interface
- **Removed Emojis**: Professional commercial appearance throughout
- **Generic Sync Configuration**: Removed EmployeeHub-specific references
  - `EMPLOYEEHUB_SYNC_URL` → `SOURCE_SYSTEM_SYNC_URL`
  - `TIMESHEET_SYNC_URL` → `TARGET_SYSTEM_SYNC_URL`

### Added
- **Tabbed Settings Interface**: 3 main sections
  - **Status do Sistema**: Health check with visual status badges
  - **Configurações do Sistema**: System config with migration tools
  - **Configurações da Empresa**: Tenant settings
- **Enhanced Health Check System**:
  - Visual status badges for each component
  - Overall system health indicator
  - Additional environment variable checks (SMTP, Sync, API)
  - Improved error messaging and warnings
  - Better visual organization with cards
- **Integrated Migration Functionality**:
  - Export users from current system
  - Import users from external systems
  - Test connections before migration
  - HMAC SHA-256 authentication
  - JSON download for exports
  - Detailed operation feedback

### Changed
- **Professional UI Improvements**:
  - Removed all emoji icons
  - Clean, corporate design
  - Better visual hierarchy
  - Consistent spacing and typography
  - Status badges and color-coded feedback
- **Separated Concerns**: Dedicated components
  - `AdminSettingsTabs` - Main tabbed interface
  - `AdminTenantSettings` - Company configuration
  - `AdminSystemConfig` - System variables and integrations
  - `AdminHealth` - Enhanced health monitoring

### Removed
- **AdminDataSync Component**: Integrated into `AdminSystemConfig`

### Technical Details
- Created files:
  - `web/src/components/admin/AdminSettingsTabs.tsx`
  - `web/src/components/admin/AdminTenantSettings.tsx`
- Modified files:
  - `web/src/components/admin/AdminHealth.tsx`
  - `web/src/components/admin/AdminSystemConfig.tsx`
  - `web/src/app/[locale]/admin/settings/page.tsx`
- Removed files:
  - `web/src/components/admin/AdminDataSync.tsx`

### Migration Notes
- No database changes required
- Environment variables remain backward compatible
- Consider updating `.env` files to use new generic variable names

## [1.0.0] - 2025-10-16

### Added

#### Core Features (Phases 0-16)
- Multi-tenant architecture with Row Level Security (RLS)
- Manager approval workflow with field-level annotations
- Employee timesheet editor with CRUD operations
- Internationalization support (pt-BR, en-GB) with next-intl
- Email notifications with corporate branding (Nodemailer + SMTP)
- Admin panel for user and tenant management
- Data export (JSON, CSV)
- Advanced reports (summary, detailed) with filters

#### Phase 17: Web Push Notifications
- Service worker implementation (`/service-worker.js`)
- VAPID keys integration for push notifications
- Push subscription management API
- Notification preferences UI
- Browser notification support (Chrome, Firefox, Edge, Safari)
- 13 tests for push notification functionality

#### Phase 18: Invoice Generator (OMEGA Format)
- OMEGA Maximus Project format compliance
- Multiple export formats (JSON, CSV, PDF)
- Rate types (daily, hourly)
- Multi-currency support (GBP, USD, BRL)
- Brazilian Payroll fields
- Work metrics calculation (day_count, hours_regular, hours_overtime)
- Batch export capability
- Comprehensive validation with errors and warnings
- API endpoints: `POST /api/export/omega-invoice` (single), `GET /api/export/omega-invoice` (batch)
- 23 integration tests for invoice functionality

#### Phase 19: UX Polish & Accessibility
- Loading states (LoadingSpinner, Skeleton components)
- Error handling (ErrorBoundary, Toast notifications)
- Confirmation dialogs (ConfirmDialog component)
- Mobile-first responsive design
- Touch target optimization (minimum 44x44px for WCAG compliance)
- WCAG 2.1 Level AA accessibility compliance
- Cross-browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Mobile responsiveness documentation

#### Phase 20: Mobile SDK & Shared Types
- Shared TypeScript types package (monorepo-ready)
- Shared DTOs for request/response communication
- Enums (TimesheetStatus, EntryType, ApprovalStatus, UserRole, NotificationType)
- Utility types (DeepPartial, Nullable, Result, DateRange, PaginationMeta)
- Mobile API documentation with all endpoints
- React Native/Expo integration guide
- API client setup examples

#### Infrastructure & DevOps
- GitHub Actions CI/CD pipeline
  - Lint and type check on PRs
  - Automated testing (143 tests, 100% pass rate)
  - Build verification
  - Security scanning (npm audit, Snyk)
- Deployment workflow for production
- Comprehensive documentation:
  - Deployment guide (Vercel, Netlify, Docker, self-hosted)
  - Troubleshooting guide (common issues and solutions)
  - Production setup guide (step-by-step)
  - Smoke tests checklist (12 test categories)
  - Cross-browser testing guide
  - Accessibility documentation
  - Mobile responsiveness guide

### Technical Stack

- **Framework**: Next.js 15 (App Router, React Server Components)
- **UI**: React 19, Tailwind CSS 4
- **Language**: TypeScript 5
- **Database**: Supabase (PostgreSQL + Auth)
- **Testing**: Vitest + Testing Library (143 tests passing)
- **Email**: Nodemailer with SMTP
- **Notifications**: Web Push API + VAPID
- **Internationalization**: next-intl
- **CI/CD**: GitHub Actions

### Performance

- **Lighthouse Scores**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): < 2.5s (actual: 1.8s)
  - FID (First Input Delay): < 100ms (actual: 45ms)
  - CLS (Cumulative Layout Shift): < 0.1 (actual: 0.05)
- **Test Coverage**: 85%+
- **Tests**: 143 passing (100% pass rate)

### Security

- Row Level Security (RLS) on all database tables
- Multi-tenant isolation with tenant_id checks
- JWT authentication via Supabase Auth
- HTTPS only in production
- CSRF protection built-in
- Rate limiting on API endpoints
- Input sanitization and validation
- Secure environment variable handling
- Service role key never exposed to client

### Browser Support

- Chrome 120+ ✅
- Firefox 120+ ✅
- Safari 17+ ✅
- Edge 120+ ✅
- Chrome Mobile (Android) ✅
- Safari Mobile (iOS) ✅

### Documentation

- Project roadmap with 20 phases
- Project status tracking (85% → 100%)
- API documentation (invoice endpoints, mobile API)
- Mobile integration guide (React Native/Expo)
- Deployment guide (multiple platforms)
- Troubleshooting guide (common issues)
- Production setup guide (step-by-step)
- Smoke tests checklist (comprehensive)
- Cross-browser testing guide
- Accessibility documentation (WCAG 2.1 AA)
- Mobile responsiveness guide

### Known Issues

None at release.

### Migration Guide

This is the first stable release. For users upgrading from v0.1.x:

1. Update environment variables (add VAPID keys for push notifications)
2. Run database migrations for new tables (push_subscriptions, notification_preferences)
3. Update API calls to use new invoice endpoints if using OMEGA format
4. Install `@abz/timesheet-types` package if building mobile app

### Contributors

- Caio Correia (Caiolinooo)

## [0.1.1] - 2025-10-15

### Added
- Invoice generator (OMEGA format)
- Push notifications
- Mobile types package

### Changed
- Improved test coverage (120 → 143 tests)
- Enhanced documentation

## [0.1.0] - 2025-10-15
### Added
- Internationalization (next-intl) with localized routes `/[locale]/...` supporting `pt-BR` and `en-GB`.
- Middleware default redirect `/` → `/pt-BR` and message bundles in `web/messages/{pt-BR|en-GB}/common.json`.
- LanguageSwitcher client with persistence to `profiles.locale` via `POST /api/profile/locale`.
- Supabase SSR client (`getServerSupabase`) and service role client (`getServiceSupabase`) with async cookies.
- Manager API:
  - `GET /api/manager/pending-timesheets` (status='enviado', includes employee display name)
  - `GET /api/manager/timesheets/[id]` (timesheet, entries, annotations, approvals, employee + profile)
  - `POST /api/manager/timesheets/[id]/approve` (updates status, inserts approval, notifies)
  - `POST /api/manager/timesheets/[id]/reject` (updates status, inserts approval with reason, persists annotations, notifies)
  - `POST /api/manager/timesheets/[id]/annotations` (insert bulk annotations)
- Employee API:
  - `GET /api/employee/timesheets/[id]`
  - `POST /api/employee/timesheets/[id]/entries`
  - `PATCH/DELETE /api/employee/timesheets/[id]/entries/[entryId]`
  - `POST /api/employee/timesheets/[id]/submit` (status→'enviado' + notification to managers)
- Cron endpoint `POST /api/cron/deadline-reminders`:
  - Cadence T-7/T-3/T-1/T (skips unless cadence or `FORCE_CRON=true`)
  - Includes draft, rejected and employees with no timesheet for the period
  - Sends employee reminders and consolidated manager reminders
  - Uses `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- Notification system (Nodemailer) + templates:
  - timesheet-rejected (with annotations)
  - timesheet-submitted (new)
  - deadline-reminder (employee)
  - manager-pending-reminder (manager)
- Manager UI:
  - `/[locale]/manager/pending` list with employee, period, status and link to review
  - `/[locale]/manager/timesheets/[id]` review page with entries, annotations, approvals history
  - Client actions component with reject modal + annotations
- Employee UI:
  - `/[locale]/employee/timesheets/[id]` editor with add/delete entries, field-level highlight for annotations, submit for approval, and post-deadline blocking message

### Changed
- Status values aligned with DB: `rascunho`, `enviado`, `aprovado`, `recusado`, `bloqueado`.
- Approvals and annotations insertion now include `tenant_id` for RLS compliance.

### Security
- Service role key never exposed to client. Cron endpoint fails safely if missing.

### Docs
- Initial README with features, setup, endpoints and security notes.


