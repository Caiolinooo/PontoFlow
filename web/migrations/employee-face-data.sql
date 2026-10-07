-- Face template storage for punch biometrics.
-- One active row per employee. No hardcoded ids.
-- Service role writes through the API. anon/authenticated cannot read encodings.

BEGIN;

CREATE TABLE IF NOT EXISTS public.employee_face_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL,
  face_encoding text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  registered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_face_data ADD COLUMN IF NOT EXISTS face_image_url text;
ALTER TABLE public.employee_face_data ADD COLUMN IF NOT EXISTS confidence_score double precision;
ALTER TABLE public.employee_face_data ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;
ALTER TABLE public.employee_face_data ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.employee_face_data ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employee_face_data_employee_id_fkey'
  ) THEN
    ALTER TABLE public.employee_face_data
      ADD CONSTRAINT employee_face_data_employee_id_fkey
      FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
  WHEN undefined_table THEN
    RAISE NOTICE 'employees table missing; face FK skipped';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'employee_face_data_employee_id_uidx'
  ) THEN
    CREATE UNIQUE INDEX employee_face_data_employee_id_uidx
      ON public.employee_face_data (employee_id);
  END IF;
EXCEPTION
  WHEN unique_violation THEN
    RAISE NOTICE 'duplicate employee_id rows; unique index skipped';
END $$;

ALTER TABLE public.employee_face_data ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.employee_face_data FROM anon, authenticated;
GRANT ALL ON public.employee_face_data TO service_role;

COMMIT;
