# Plano de Ação — Time Sheet Offshore ABZ Group

## 1. Visão geral e objetivos
Criar um app/webservice de marcação de timesheet para colaboradores embarcados (offshore) com:
- Autenticação, criação de conta e gerenciamento de permissões (colaborador, gerente, admin)
- Lançamentos de Embarque, Desembarque, Translado, comentários e horários
- Fluxo de aprovação por gerente responsável
- Notificações por e-mail, in-app e (opcional) push do navegador
- Integração visual com o Employee Hub (layout/base)
- Exportação/Importação total dos dados (para módulos do painel e gerador de invoice)
- Base para futuro app mobile iOS/Android

## 2. Benchmark (achados principais)
Com base em UKG/Kronos, SAP SuccessFactors, Clockify, Toggl, e Ahgora:
- Fluxo de aprovação de timesheet (envio semanal/quinzenal/mensal; aprovação/recusa; comentários de retorno)
- Notificações automáticas a gerentes e colaboradores (pendências, prazos, alterações)
- Autoatendimento (colaborador) e painéis para gerentes (pendências em massa)
- Trilhas de auditoria e bloqueio/fechamento de períodos após aprovação
- Exportações (CSV/JSON) e APIs extensíveis para integrações
- Perfis/roles claros e controles de acesso (RBAC)

## 3. Arquitetura proposta (alto nível)
- Front-end Web: Next.js (TypeScript) reutilizando o visual do Employee Hub
- Backend/API: NestJS (ou Next API Routes/Edge Functions, se integrado ao Hub)
- Banco/Auth: Supabase (Postgres + RLS + Auth)
- Notificações: provedor de e-mail (Resend/SendGrid), Web Push (VAPID), in-app via canal realtime
- Fila/Agendamentos: Redis (BullMQ) ou Cron serverless para lembretes e processamento assíncrono
- Observabilidade: logs estruturados, métricas básicas e auditoria de ações

### 3.1. Três situações suportadas
1) Módulo integrado ao Employee Hub
- Roteado como “Timesheet” dentro do painel; usa o mesmo Supabase/Auth
- Backend pode ser Edge Functions/Next API Routes do próprio painel

2) Projeto standalone com APIs de Import/Export
- Serviço próprio (NestJS) com OpenAPI; expõe exportação completa (CSV/JSON) e importação
- Autenticação via tokens/jwt do Supabase; permissões por role/escopo

3) Base para app mobile (futuro)
- App React Native (Expo) consumindo as mesmas APIs e esquema de auth
- Notificações push móveis via serviço (Expo/FCM/APNS)

## 4. Stack recomendada por âmbito
- UI Web: Next.js 15 + TypeScript + Tailwind + shadcn/ui (ou componentes do Hub)
- Estado: React Query; formulários com Zod/React Hook Form
- Backend: NestJS 11 + Prisma (Postgres Supabase) OU Next API/Edge Functions se integrado
- Auth/RBAC/DB: Supabase (RLS, Policies, OTP/Magic Link/Email+Senha)
- Notificações: Resend/SendGrid (e-mail); web-push (VAPID); canal realtime (Supabase)
- Fila/Jobs: BullMQ + Upstash Redis (ou cron serverless)
- Testes: Jest/Vitest (unit), Playwright (e2e), Supertest (API)
- CI: GitHub Actions (lint, typecheck, tests, build)

## 5. Plano faseado
Fase 0 — Alinhamento e Setup
- Decidir: integrado ao Employee Hub vs standalone (ou ambos via monorepo)
- Criar repositório GitHub e CI básico
- Definir naming conventions e DoD

Fase 1 — Fundações
- Esquema inicial Supabase: employees, managers, timesheets, entries, approvals, comments, notifications
- Auth e RBAC (colaborador, gerente, admin); RLS básica
- UI inicial: cadastro/login, dashboard do colaborador, criação de lançamentos
- Painel do gerente: lista de pendências e aprovação simples

Fase 2 — Notificações e Auditoria
- E-mail transacional (envio/pendências/resultado de aprovação)
- In-app realtime; web push (opcional)
- Auditoria (log de ações, bloqueio de períodos)

Fase 3 — Import/Export e Integrações
- Endpoints de exportação completa (JSON/CSV) e importação
- Conexão com gerador de invoice (contratos/formato de dados)
- Relatórios e filtros

Fase 4 — Refinos e Mobile (base)
- Polimento UX; acessibilidade; internacionalização
- Preparar SDK compartilhado e tipos para futura app mobile

## 6. Próximas decisões (com o solicitante)
- Nome do repositório GitHub, visibilidade (privado/público), licença e .gitignore
- Integração ao Employee Hub: qual stack está em uso no “painel-abz”? (React/Next? Biblioteca de componentes?)
- Provedor de e-mail preferido (Resend/SendGrid) e domínio de envio
- Preferência de fila (Redis) vs cron serverless
- Escopo inicial de exportação para o gerador de invoice (campos obrigatórios)

## 7. Entregáveis imediatos
- Documento de Regras e Tarefas (backlog, critérios de aceitação, padrões)
- Esboço de esquema de dados e endpoints (v1)
- Configuração inicial do repositório (após validações acima)


## 8. Atualizações conforme nota do solicitante (multi-tenant e gestão avançada)

- Multi-tenant (Clientes/Ambientes): separar dados por tenant/cliente e, opcionalmente, por ambiente; toda tabela crítica inclui `tenant_id` e RLS segmentada. Suporte futuro a subdomínios ou seleção de ambiente após login.
- Admin de Clientes/Ambientes (somente Admin global): painel para criar/editar clientes (tenants), ambientes, usuários e grupos; definir regras especiais por grupo/usuário.
- Gestão de usuários: CRUD completo, alteração de roles por tenant (colaborador, gerente, tenant-admin, admin global), reset de senha, MFA opcional; UX alinhada ao Employee Hub.
- Grupos e delegações: gerentes recebem notificações e podem aprovar apenas dos grupos a eles delegados; um colaborador pode pertencer a 1+ grupos; grupos podem ser por cliente/ambiente.
- Perfil completo de colaborador: dados pessoais (LGPD), embarcação, documentos, contatos, cargo, centro de custo, cliente/ambiente; trilha de alterações.
- Notificações multi-tenant: e-mail (Gmail via Nodemailer, utilizando credenciais `apiabz` já usadas no Hub), in-app realtime (Supabase), web push (opt-in) — preferências por usuário.
- Standalone agora, integração futura: respeitar layout/tema do Employee Hub (para facilitar a futura incorporação); extrair tema/variáveis e componentes base; prever compartilhamento de sessão/auth via Supabase quando integrar.
- Export/Import com tenant: incluir `tenant_id`/cliente/ambiente em todos os registros exportados; contrato v1 alinhado ao gerador de invoice; caminho para ingestão direta futura (sem planilha).
- Segurança e LGPD: consentimentos, retenção por cliente, auditoria e trilhas de aprovação por tenant.

## 9. Decisões confirmadas

- Começar como projeto standalone, com arquitetura preparada para virar módulo do Employee Hub.
- Reutilizar visual/tema do Employee Hub (Next.js 15, Tailwind, Supabase já confirmados no painel).
- E-mail: usar Gmail via Nodemailer (apiabz) inicialmente; avaliar Resend/SendGrid no futuro.
- Repositório GitHub: público, nome sugerido `timesheet-manager`, licença copiada do `painelabz` (criação pendente de token/autorização para API).
