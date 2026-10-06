# Migrations legacy (integração ABZ)

Scripts nesta pasta são **opt-in** e NÃO fazem parte do caminho default de setup
(`migrations/setup-wizard/`). Só execute em deployments legados que ainda
precisam da integração com o Painel ABZ via tabela `users_unified`.

- `SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-ABZ.sql` — trigger que replica
  `profiles` → `users_unified`. Equivalente configurável (default **off**) em
  `../SYNC-PROFILES-TO-USERS-UNIFIED-TRIGGER-CONFIGURABLE.sql`
  (`system_config.enable_users_unified_sync`).
- `DISABLE-ABZ-SYNC-FOR-FUTURE-CLIENTS.sql` — remove o trigger acima em
  instâncias novas.

Relacionado (runtime): o fallback de login bcrypt contra `users_unified` em
`src/lib/auth/custom-auth.ts` fica desligado por padrão e só é ativado com a
env `ENABLE_LEGACY_ABZ_AUTH=true`.
