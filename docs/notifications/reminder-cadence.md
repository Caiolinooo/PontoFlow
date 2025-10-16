# Lembretes de prazo — Cadência padrão

Deadline: dia 1 (00:00) para fechamento do mês anterior.

## Cadência (aprovada)
- T - 7 dias: lembrete ao colaborador pendente e resumo ao gerente (por grupo)
- T - 3 dias: idem
- T - 1 dia: idem (urgente)
- T (dia 1): resumo final de pendências para gestores; bloqueio aplicado aos colaboradores

## Evento e conteúdo
- Colaborador: "Seu timesheet do período {period} está pendente. Tempo restante: {days} dias."
- Gerente: "Pendências de timesheets nos grupos: {list}."

## Implementação
- Tarefa diária (cron/edge function) que:
  1) Identifica timesheets do mês corrente ainda não enviados
  2) Mapeia colaboradores por gerente (delegação)
  3) Enfileira notificações no idioma do destinatário (profiles.locale)
- Notificações via e-mail + in-app; push opcional (opt-in)

