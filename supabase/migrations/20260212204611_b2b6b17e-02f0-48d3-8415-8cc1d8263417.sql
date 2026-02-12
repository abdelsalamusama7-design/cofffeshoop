
CREATE TABLE public.shift_resets (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  reset_date TEXT NOT NULL,
  reset_time TEXT NOT NULL,
  report_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.shift_resets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to shift_resets" ON public.shift_resets FOR ALL USING (true) WITH CHECK (true);
