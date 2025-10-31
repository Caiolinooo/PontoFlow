[ ] NAME:Current Task List DESCRIPTION:Root task for conversation __NEW_AGENT__
-[x] NAME:Investigate/Triage – Employee list error and calendar visibility DESCRIPTION:Identify why the employee timesheets list shows an error and ensure the calendar editor is reachable. Inspect list page, editor page, and related API.
-[x] NAME:Fix employee list: align schema, avoid invalid UUID, add current-month shortcut DESCRIPTION:Update employee list page to only query when employee exists, render periodo_ini/periodo_fim + status, and add shortcut link to /employee/timesheets/current.
-[x] NAME:Implement full‑bleed calendar mode for editor DESCRIPTION:Wrap TimesheetEditor in a FullBleed container to extend to full viewport width and ensure tall layout.
-[x] NAME:Validate in UI: employee list loads and editor shows full‑bleed calendar DESCRIPTION:Run a quick manual smoke test in the browser: list page shows rows or empty state without error; creating/opening timesheet shows calendar stretched full width.
-[x] NAME:Employee self-bootstrap flow DESCRIPTION:Create server page /employee/bootstrap to upsert profile and create employees row for the current user, then redirect to the current month timesheet. Add CTA in the list page when not linked.
-[x] NAME:Admin panel – scope and execution plan DESCRIPTION:Inventory existing admin modules (users, employees, delegations, timesheets), identify gaps vs. backlog, and plan iterations to implement all required modules for testing.
-[x] NAME:Fix: Client function props in Admin Delegations (GroupForm/GroupDetailPanel) DESCRIPTION:Refactor client components to use useTranslations instead of receiving t from server; update server pages to stop passing functions.
-[x] NAME:Fix: Hydration mismatch in ThemeToggle DESCRIPTION:Defer dynamic title and icon to post-mount and add a stable pre-mount render to avoid SSR/CSR mismatch.
-[x] NAME:Fix: Manager Pending – invalid URL on server fetch DESCRIPTION:Build absolute base URL from request headers (x-forwarded-proto/host) with fallback to NEXT_PUBLIC_BASE_URL, then call the API.
-[x] NAME:Fix: Admin Tenants POST failing under RLS DESCRIPTION:Use getServerSupabase (with user session) instead of raw anon client so RLS permits admin insert; keep logging for debugging.
-[x] NAME:Admin – Usuários: filtros, paginação e SSR Supabase DESCRIPTION:Adicionar busca (q), filtro por role e status, paginação server-side e trocar para getServerSupabase no list/edit.
-[ ] NAME:Admin – Colaboradores: melhorar CRUD e filtros DESCRIPTION:Substituir prompts por formulário de edição, adicionar filtros/busca e preparar importação CSV (endpoint + UI inicial).
-[x] NAME:Stabilizar Admin – Server Components e SSR fetch DESCRIPTION:Trocar createClient por getServerSupabase em páginas Server do Admin (delegations, access-control, settings, timesheets/view) e padronizar fetch SSR com base absoluta via headers.
-[/] NAME:Stabilizar Admin – APIs Admin com getServerSupabase DESCRIPTION:Migrar rotas /api/admin de createClient(anon) para getServerSupabase para respeitar sessão/RLS (employees, environments, periods, permissions, audit, vessels, delegations, users, settings, declarations).
-[x] NAME:Corrigir strings corrompidas (Admin → Vessels New) DESCRIPTION:Ajustar labels/textos com caracteres quebrados na tela Nova Embarcação.
-[x] NAME:Admin – Tenant Switcher global e padronização nas listas DESCRIPTION:Adicionar TenantSwitcher no layout do Admin; padronizar listas (Ambientes, Embarcações, Funcionários) com tratamento 409 tenant_required e botão "Selecionar tenant"; corrigir prompts para não enviar valores em branco ao cancelar.
-[x] NAME:Admin – Tenants > Associações (gestão em lote) DESCRIPTION:Criar página /admin/tenants/associations para gerenciar quais funcionários pertencem ao tenant atual e API PATCH/GET /api/admin/tenants/associations para adicionar/remover em lote.
-[x] NAME:Correção Next.js 15: await headers() em páginas Admin DESCRIPTION:Auditar pontos críticos e aplicar await em headers() onde necessário (ex.: /admin/delegations/groups/[id], /admin/timesheets/view/[id]).
-[x] NAME:Investigate/Triage – Employees tab error 'column employees.profile_id does not exist' DESCRIPTION:Confirm current database schema for public.employees, verify columns and constraints, and review API/UI usage of profile_id to determine safest fix.
-[x] NAME:DB migration – Ensure employees.profile_id exists and is linked to profiles(user_id) DESCRIPTION:Run idempotent SQL: add column if not exists, backfill from employees.user_id when present, add FK constraint, index, and set NOT NULL only if safe. Validate RLS policies referencing profile_id.
-[/] NAME:Verify and polish Employees module DESCRIPTION:Reload Admin > Funcionários, confirm list loads with display_name/email, test Add/Update/Delete, and ensure tenant 409 flow works.
-[ ] NAME:Plan/Implement Periods hierarchy with overrides (Tenant→Environment→Group→Employee) DESCRIPTION:Design tables and APIs for hierarchical period locks, implement resolver and initial UI (tabs), update checks to use effective lock.
--[x] NAME:Fix Periods page syntax and move Env/Group UI to return DESCRIPTION:Remove misplaced JSX inside toggleEnv, implement env/group helper functions, and place sections in the component return
--[x] NAME:DB migration – create hierarchy lock tables and align employees schema DESCRIPTION:Idempotent SQL to create period_locks_environment/group/employee and ensure employees has tenant_id/profile_id FKs and unique constraint
--[x] NAME:APIs – Env/Group/Employee period locks DESCRIPTION:Create /api/admin/periods/{environments,groups,employees} with GET/POST and 409 tenant pattern
--[x] NAME:UI – Add Env/Group/Employee override sections in Admin > Períodos DESCRIPTION:Search/select lists per entity and 12-month toggles with 409 tenant modal
--[x] NAME:Resolver – Implement getEffectivePeriodLock() DESCRIPTION:Shared lib to cascade employee > group > environment > tenant for a given employee+month
--[x] NAME:Wire resolver – Employee create timesheet API DESCRIPTION:Use getEffectivePeriodLock in POST /api/employee/timesheets instead of tenant-only check
--[x] NAME:Wire resolver – Remaining write APIs (entries create/update, manager edit/submit) DESCRIPTION:Replace direct period_locks checks with effective resolver; keep admin bypass and manager justification flow
-[x] NAME:Wire resolver – Employee current-page SSR uses hierarchical locks DESCRIPTION:Update /[locale]/employee/timesheets/current/page.tsx to use getServerSupabase and getEffectivePeriodLock instead of createClient and direct period_locks query; verify with diagnostics.
-[x] NAME:Investigate: Can't link my user on Employees (RLS/tenancy/i18n) DESCRIPTION:Reproduce the issue on Admin > Employees, verify API /api/admin/employees POST, RLS bypass, and auto-create profile linkage.
-[x] NAME:Fix SignUpForm schema with i18n and placeholders DESCRIPTION:Rebuild Zod schema using next-intl validation keys, wire placeholders and errors; ensure successful flow.
-[x] NAME:Branding: configurable logo/site title + apply to Header and Auth pages DESCRIPTION:Create branding.ts with NEXT_PUBLIC_* overrides; show logo/title on Header, Sign In, Sign Up, Reset.
-[x] NAME:Auth UX polish: Sign in/up/reset pages visual refresh + hard logout redirect DESCRIPTION:Improve auth page layout, unify styles, and ensure logout performs hard navigation.
-[x] NAME:Employees module: i18n on New and List pages + Users as data source UX DESCRIPTION:Translate strings via next-intl, use new admin.employees keys, improve tenant selection messages.
-[/] NAME:Translations audit: convert remaining pages to next-intl DESCRIPTION:Scan Admin (users, delegations, vessels, environments, periods), Manager and Employee screens; extract strings to messages and replace with t().
-[x] NAME:Fix Employees POST: set name to satisfy NOT NULL constraint DESCRIPTION:In /api/admin/employees POST, set employees.name from profile.display_name or user fields to avoid null constraint violations; re-test creation from UI.
-[x] NAME:Auth forms theming and button visibility DESCRIPTION:Replace custom Tailwind colors with CSS tokens (var(--primary), var(--foreground), var(--border)) across SignIn, SignUp, Reset forms; ensure submit buttons visible on dark/light themes.
-[/] NAME:Translations: admin.employees (en-GB) missing keys DESCRIPTION:Clean up en-GB messages JSON to properly include admin.employees listTitle/listSubtitle/id/profile/vessel/position/costCenter/actions; remove stray duplicate block at the end.
-[ ] NAME:Verifique o erro dos grupos. DESCRIPTION:A param property was accessed directly with `params.locale`. `params` is now a Promise and should be unwrapped with `React.use()` before accessing properties of the underlying params object. In this version of Next.js direct access to param properties is still supported to facilitate migration but in a future version you will be required to unwrap `params` with `React.use()`.
-[ ] NAME:Na aba funcionarios dentro do ADMIN DESCRIPTION:Consegui criar um funcionario, porem ele não aparece, nao carrega funcionario algum
-[ ] NAME:Na aba funcionarios dentro do ADMIN DESCRIPTION:Todos os textos estão como placeholder para a tradução.
-[ ] NAME:Na aba funcionarios dentro do ADMIN DESCRIPTION:Temos sete erros aparecendo ao acessar a pagina.
intercept-console-error.ts:44 IntlError: MISSING_MESSAGE: Could not resolve `admin.employees.listTitle` in messages for locale `pt-BR`.
    at getFallbackFromErrorAndNotify (node_modules_a35e655…s:sourcemap:4810:23)
    at translateBaseFn (node_modules_a35e655…s:sourcemap:4832:20)
    at translateFn (node_modules_a35e655…s:sourcemap:4892:24)
    at safe (src_40655a47._.js:sourcemap:293:20)
    at EmployeesListPage (src_40655a47._.js:sourcemap:308:43)
    at Object.react_stack_bottom_frame (node_modules_next_di…:sourcemap:13072:24)
    at renderWithHooksAgain (node_modules_next_di…s:sourcemap:4146:24)
    at renderWithHooks (node_modules_next_di…s:sourcemap:4097:28)
    at updateFunctionComponent (node_modules_next_di…s:sourcemap:5523:21)
    at beginWork (node_modules_next_di…s:sourcemap:6111:24)
    at runWithFiberInDEV (node_modules_next_di…js:sourcemap:886:74)
    at performUnitOfWork (node_modules_next_di…s:sourcemap:8298:97)
    at workLoopSync (node_modules_next_di…s:sourcemap:8190:40)
    at renderRootSync (node_modules_next_di…s:sourcemap:8173:13)
    at performWorkOnRoot (node_modules_next_di…:sourcemap:7908:212)
    at performWorkOnRootViaSchedulerTask (node_modules_next_di…js:sourcemap:8882:9)
intercept-console-error.ts:44 IntlError: MISSING_MESSAGE: Could not resolve `admin.employees.listSubtitle` in messages for locale `pt-BR`.
    at getFallbackFromErrorAndNotify (node_modules_a35e655…s:sourcemap:4810:23)
    at translateBaseFn (node_modules_a35e655…s:sourcemap:4832:20)
    at translateFn (node_modules_a35e655…s:sourcemap:4892:24)
    at safe (src_40655a47._.js:sourcemap:293:20)
    at EmployeesListPage (src_40655a47._.js:sourcemap:316:43)
    at Object.react_stack_bottom_frame (node_modules_next_di…:sourcemap:13072:24)
    at renderWithHooksAgain (node_modules_next_di…s:sourcemap:4146:24)
    at renderWithHooks (node_modules_next_di…s:sourcemap:4097:28)
    at updateFunctionComponent (node_modules_next_di…s:sourcemap:5523:21)
    at beginWork (node_modules_next_di…s:sourcemap:6111:24)
    at runWithFiberInDEV (node_modules_next_di…js:sourcemap:886:74)
    at performUnitOfWork (node_modules_next_di…s:sourcemap:8298:97)
    at workLoopSync (node_modules_next_di…s:sourcemap:8190:40)
    at renderRootSync (node_modules_next_di…s:sourcemap:8173:13)
    at performWorkOnRoot (node_modules_next_di…:sourcemap:7908:212)
    at performWorkOnRootViaSchedulerTask (node_modules_next_di…js:sourcemap:8882:9)
intercept-console-error.ts:44 IntlError: MISSING_MESSAGE: Could not resolve `admin.employees.id` in messages for locale `pt-BR`.
    at getFallbackFromErrorAndNotify (node_modules_a35e655…s:sourcemap:4810:23)
    at translateBaseFn (node_modules_a35e655…s:sourcemap:4832:20)
    at translateFn (node_modules_a35e655…s:sourcemap:4892:24)
    at safe (src_40655a47._.js:sourcemap:293:20)
    at EmployeesListPage (src_40655a47._.js:s
-[ ] NAME:✓ Compiled /[locale]/admin/settings in 549ms Error: MISSING_MESSAGE: Could not resolve `common` in messages for locale `pt-BR`.     at async AdminSettingsPage (src\app\[locale]\admin\settings\page.tsx:8:13)    6 |   const { locale } = await props.params;    7 |   await requireRole(locale, ['ADMIN']); >  8 |   const t = await getTranslations('common');      |             ^    9 |   10 |   const supabase = await getServerSupabase();   11 |   // Fetch current settings server-side {   code: 'MISSING_MESSAGE',   originalMessage: 'Could not resolve `common` in messages for locale `pt-BR`.' } DESCRIPTION:
-[x] NAME:Auth fields: adopt Meta-style floating labels DESCRIPTION:Create reusable FloatingInput and migrate SignIn, SignUp, Reset to use it. Improve contrast and focus states.
-[x] NAME:Global form styles & tokens DESCRIPTION:Add input tokens (--input, --input-border, placeholders) and global CSS for input/label contrast applied across the app.
-[ ] NAME:Clean up translations JSON duplicates (en-GB & pt-BR) DESCRIPTION:Remove duplicated trailing keys in admin.employees in both common.json files and validate JSON.