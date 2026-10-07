-- Biometric punch traceability: link every timesheet entry to its facial verification.
--
-- 1) timesheet_entries.verification_id: entry -> verification that authorized it
--    (NULL only for rows created before this rule or by flows without biometrics).
-- 2) timesheet_entry_verifications.entry_id becomes nullable: the verification
--    happens BEFORE the entry exists (verify-then-punch), so it is linked after
--    insert. Kept for backward compatibility; new code links via
--    timesheet_entries.verification_id.

BEGIN;

ALTER TABLE public.timesheet_entries
  ADD COLUMN IF NOT EXISTS verification_id uuid NULL;

ALTER TABLE public.timesheet_entry_verifications
  ALTER COLUMN entry_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_timesheet_entries_verification_id
  ON public.timesheet_entries (verification_id);

CREATE INDEX IF NOT EXISTS idx_entry_verifications_employee_recent
  ON public.timesheet_entry_verifications (employee_id, verified_at DESC);

COMMIT;
