
CREATE TABLE public.backups (
  id text PRIMARY KEY,
  backup_data jsonb NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by text NOT NULL
);

ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to backups"
ON public.backups
FOR ALL
USING (true)
WITH CHECK (true);
