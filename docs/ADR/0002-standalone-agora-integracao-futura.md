# ADR 0002 — Modo de implantação: Standalone agora; integração futura ao Employee Hub

Status: Aceito
Data: 2025-10-15
Supersede: ADR-0001

## Contexto
O solicitante confirmou que deseja operar o Timesheet Manager como aplicativo standalone inicialmente, preservando um caminho claro para integração futura ao Employee Hub. Há requisitos de multi-tenant (clientes/ambientes), delegação por grupos e export/integração com o gerador de invoice.

## Decisão
- Aplicativo standalone (Next.js + API), reutilizando tema/estilos do Hub para facilitar a futura incorporação.
- Supabase (Postgres + Auth + Storage + Realtime) como base única de dados/autenticação.
- Definir contratos (DTOs/OpenAPI) e componentes de UI desacoplados para facilitar o encaixe como módulo do Hub depois.

## Consequências
- Prós: independência de release do Hub; publicação isolada; menor risco de impacto no painel.
- Contras: duas bases de UI (módulo vs app) exigem disciplina para manter compatibilidade de estilos e contratos.

## Implementação
- Criar pacote/ui com tokens/tema do Hub e componentes compatíveis.
- APIs documentadas (OpenAPI), export v1 (CSV/JSON) com tenant_id e environment.
- Migrações Supabase v1.1 com RLS por tenant/grupos.
- E-mail: Gmail/Nodemailer (apiabz) no início; plano de migração para Resend/SendGrid documentado.

## Observações
- Quando for integrar ao Hub, reutilizar Auth/Sessão do Supabase; habilitar RLS e políticas idênticas.

