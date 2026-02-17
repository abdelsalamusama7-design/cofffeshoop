
-- Create worker_expenses table for worker cash withdrawals
CREATE TABLE public.worker_expenses (
  id text NOT NULL PRIMARY KEY,
  worker_id text NOT NULL,
  worker_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  date text NOT NULL,
  time text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.worker_expenses ENABLE ROW LEVEL SECURITY;

-- Allow all access (matching existing pattern)
CREATE POLICY "Allow all access to worker_expenses"
ON public.worker_expenses
FOR ALL
USING (true)
WITH CHECK (true);
