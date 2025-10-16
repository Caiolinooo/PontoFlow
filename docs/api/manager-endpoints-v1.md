# Manager Endpoints v1

Base: autenticado (Supabase Auth), escopo de acesso por RLS (delegação de grupos)

## GET /api/manager/pending-timesheets
- Lista timesheets "enviado" pendentes do gerente (delegação)
- Query: `page`, `pageSize`, `employee`, `period`
- Resposta: `{ items: [{ id, employeeName, period, submittedAt, entryCount }], total }`

## GET /api/manager/timesheets/:id
- Retorna visão completa para revisão
- Inclui: employee, vessel, período, entries (com comments), annotations anteriores, approval history

## POST /api/manager/timesheets/:id/approve
- Aprova o timesheet
- Body: `{ message?: string }`
- Efeitos: cria `approvals` (status=approved), atualiza status do timesheet, dispara notificação (e-mail + in-app)

## POST /api/manager/timesheets/:id/reject
- Reprova com motivo e anotações inline
- Body: `{ reason: string, annotations?: Array<{ entry_id?: string, field_path?: string, message: string }> }`
- Efeitos: cria `approvals` (status=rejected, reason), cria `timesheet_annotations`, muda status do timesheet, notifica colaborador

## POST /api/manager/timesheets/:id/annotations
- Adiciona anotações durante a revisão
- Body: `{ annotations: Array<{ entry_id?: string, field_path?: string, message: string }> }`

## Segurança / Validações
- Delegação checada por RLS (manager_group_assignments x employee_group_members)
- Bloqueio de colaborador pós-prazo não afeta gerente (políticas já cobrem)
- Logs/auditoria para aprovações e rejeições

## i18n
- Mensagens e e-mails derivados destes endpoints devem ser traduzidos (pt-BR/en-GB) via serviço de notificação

