# Changelog (Web)
<!-- markdownlint-disable MD024 -->


## [0.1.6] - 2025-10-24

### Changed

- Branding: remoção final de quaisquer referências "ABZ" (UI, cores, gerador de invoice, templates de e‑mail)
- Dashboard: substituídas classes de cor específicas por variáveis CSS (`[var(--primary)]`)
- Header: `hover:text-abz-blue` → `hover:text-[var(--primary)]`
- Invoice: padrão do emissor agora "PontoFlow" e `billing@pontoflow.app`
- E-mails: títulos e rodapés padronizados para "PontoFlow - Timesheet Manager"; URL de fallback `https://pontoflow.app`

### Fixed

- Dashboard: corrigido texto corrompido para "Configurações e gestão do sistema"
- Tests: ajustes nos seletores de validação dos formulários de Auth e expectativas dos templates de e‑mail; suíte verde

### Build

- Type-check e build de produção passando (Turbopack). Import dinâmico de `puppeteer` mantém build verde sem dependência opcional.


## [0.1.5] - 2025-10-24

### Fixed

- Next.js 15 compatibility: awaited `headers()` in Manager pages; adjusted `searchParams` handling in Admin > Users
- Audit logger: added actions `manager_edit_closed_period` e `employee_acknowledge_adjustment`
- Notifications dispatcher: payloads aceitam `tenantId` opcional em submitted/approved/rejected
- Admin > Health: tratamento de env nulos em máscara; tipos saneados
- Admin > Tenants > Associations: uso de `.select('id')` no Supabase e formatação null‑safe
- Manager > Entries: tipos explícitos em mapeamentos para evitar `any`
- PDF declaration route: resposta como `Blob` e import dinâmico de `puppeteer` com fallback (build verde sem dep opcional)

### Build

- `npm run type-check` e `npm run build` passando sem erros

## [0.1.4] - 2025-10-24

### Changed

- Branding: Project renamed to PontoFlow; removed all ABZ references (assets, messages, docs)
- Auth UI: Gradients updated to blue→indigo on Auth pages
- Icons: Metadata icons now use `/brand/logo.svg`
- Admin Header: Passes server-fetched `initialUser` to Header to avoid flicker
- Docs: README and Commercial License updated with owner information

### Removed

- `public/logo-abz.png`

## [0.1.3] - 2025-10-17

### Added

- Dark/Light theme support with toggle in Header (`ThemeToggle`) and CSS variables in globals
- Base UI components: `Button`, `Card`, `Modal`, `Table`, `LoadingSpinner` (unified styling, dark mode aware)
- Toast system and provider (`ToastProvider`) wired via `AppShell`
- API test for Notification Preferences (`/api/notifications/preferences`)

### Changed

- Header and layout updated for dark mode and better mobile responsiveness (flex-wrap, colors)

### Build/Test

- Production build passing; test suite green (145+ tests)

## [0.1.2] - 2025-10-16

### Changed
- Migrated all API routes to custom authentication (`users_unified`) with role checks and tenant isolation
- Normalized email on login/signup (lowercase) to fix credential mismatch without resetting passwords

### Added
- Notification Preferences API: `GET/POST /api/notifications/preferences`
- Preferences persistence in UI (`NotificationPreferencesPanel`) with Save action

### Fixed
- Minor TypeScript issues in routes during auth migration

## [0.1.1] - 2025-10-16

### Fixed

- Build: TypeScript typing for invoice export route (`/api/export/invoice`) — handled Supabase join typing and PDF response body using web-compatible types (ArrayBuffer/Blob).
- Reports: Normalized `employee` relation shape in `/api/reports/generate` and `/api/reports/export` to satisfy strict types.
- Push: Fixed `applicationServerKey` typing in `usePushNotifications` to use ArrayBuffer (copy), compatible with TypeScript BufferSource.
- Tests: Kept `invoiceToPDF` Node Buffer return to preserve backwards compatibility; all tests pass (117/117).

## [0.1.0] - 2025-10-16

### Added

- **Phase 16: Reports & Advanced Filters** ✅
  - Summary reports with status counts (total, approved, rejected, pending, draft, locked)
  - Detailed reports with entries and annotations
  - Advanced filtering: date range, status, employee ID
  - CSV export with proper escaping
  - JSON export format
  - GET `/api/reports/generate` - Generate reports
  - GET `/api/reports/export` - Export reports
  - `ReportFilters` component with advanced UI
  - `ReportTable` component with export buttons
  - `ReportsClient` component for main page
  - Report generation logic in `lib/reports/generator.ts`
  - 12 comprehensive tests for report generation
  - Full i18n support (pt-BR/en-GB)
  - Responsive UI with Tailwind CSS

### Infrastructure

- Added report generation library
- Added report components
- Added report API endpoints
- Added report translations
- Added report tests

## [0.3.0] - 2025-10-16

### Added

- **Phase 12: Integration Tests** ✅
  - Vitest test runner with jsdom environment
  - 41 comprehensive tests (15 workflow + 8 component + 18 email)
  - Test configuration: `vitest.config.ts`, `vitest.setup.ts`
  - npm scripts: `test`, `test:ui`, `test:coverage`
  - TESTING.md documentation

- **Phase 13: Inline Editing & UI Highlights** ✅
  - PATCH endpoint: `/api/employee/timesheets/[id]/entries/[entryId]/patch`
  - `AnnotatedFieldHighlight` component with severity levels
  - `AnnotatedEntryList` component with field-level highlighting
  - Bilingual labels (pt-BR/en-GB)
  - Tooltip support for annotations

- **Phase 14: Admin Panel (Partial)** ✅
  - GET/POST `/api/admin/tenants` - Tenant management
  - GET/POST `/api/admin/users` - User management
  - Admin-only access control (ADMIN_GLOBAL, TENANT_ADMIN)
  - User creation with email confirmation
  - Tenant isolation in listings

- **Phase 15: Export/Import (Partial)** ✅
  - GET `/api/export?format=json|csv` - Data export
  - JSON (normalized) and CSV (quick-use) formats
  - Tenant isolation in exports
  - Period filtering support
  - Full audit trail export

### Infrastructure

- Updated package.json with test dependencies
- All TypeScript types properly defined
- Production build passing (no errors)
- ESLint compliance verified

## [0.2.0] - 2025-10-15

### Added - Corporate Email Standardization

- **Corporate Email Layout**: Novo wrapper `email-layout.ts` com branding corporativo (logo, cores, layout responsivo)
- **Email Templates Corporativos**: Todos os 5 templates atualizados com padrão corporativo formal
  - `timesheet-rejected.ts`: Rejeição com anotações e motivo destacado
  - `timesheet-approved.ts`: Aprovação com sucesso (novo template)
  - `timesheet-submitted.ts`: Submissão para gerente com CTA
  - `deadline-reminder.ts`: Lembrete com urgência dinâmica (cores por dias restantes)
  - `manager-pending-reminder.ts`: Consolidado de pendências por grupo
- **Logo**: Adicionado `public/brand/logo.svg` (logo padrão)
- **Dispatcher Atualizado**: Suporte a `timesheet_approved` com template corporativo

### Changed

- Todos os templates agora usam `emailLayout()` com:
  - Cabeçalho gradiente (azul → roxo)
  - Logo PontoFlow centralizada
  - Conteúdo formatado com caixas de destaque
  - Rodapé com copyright e disclaimer bilíngue
  - CSS inline para compatibilidade com clientes de email
- Endpoint `/api/manager/timesheets/[id]/approve` agora inclui `managerName` na notificação
- Tipos de evento em `dispatcher.ts` reforçam `managerName` obrigatório

### Fixed

- Corrigido tipo de parâmetro em `deadline-reminder.ts` (função `subject` com tipo `(d: number)`)
- Resolvido problema de encoding em `manager-pending-reminder.ts` (recriado com UTF-8 limpo)

## [0.1.0] - 2025-10-15

### Added

- i18n (pt-BR/en-GB) com next-intl e rotas localizadas
- Persistência de locale em `profiles.locale` via `/api/profile/locale`
- Endpoints de gerente (pendências, detalhes, aprovar, recusar, anotações)
- Endpoints de colaborador (listar/criar/editar/remover entradas e enviar)
- Cron de lembretes (T-7/T-3/T-1/T) abrangendo rascunho/recusado/ausente
- Sistema de notificações e templates (submit/reject/approve/deadline/manager)
- UI do gerente (fila de pendências + revisão com histórico)
- UI do colaborador (editor com bloqueio pós-prazo e destaque de anotações)

### Changed

- Status alinhados ao banco (pt-BR) e inserts com `tenant_id`

