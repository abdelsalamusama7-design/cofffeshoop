
-- Workers table
CREATE TABLE public.workers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker',
  password TEXT NOT NULL,
  salary NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to workers" ON public.workers FOR ALL USING (true) WITH CHECK (true);

-- Products table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sell_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  category TEXT,
  ingredients JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Inventory table
CREATE TABLE public.inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  cost_per_unit NUMERIC NOT NULL DEFAULT 0,
  sell_price NUMERIC,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to inventory" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

-- Sales table
CREATE TABLE public.sales (
  id TEXT PRIMARY KEY,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total NUMERIC NOT NULL DEFAULT 0,
  discount JSONB,
  worker_id TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to sales" ON public.sales FOR ALL USING (true) WITH CHECK (true);

-- Attendance table
CREATE TABLE public.attendance (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  type TEXT NOT NULL DEFAULT 'present',
  shift TEXT,
  hours_worked NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to attendance" ON public.attendance FOR ALL USING (true) WITH CHECK (true);

-- Worker transactions table
CREATE TABLE public.transactions (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  note TEXT DEFAULT '',
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);

-- Expenses table
CREATE TABLE public.expenses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT '',
  note TEXT DEFAULT '',
  date TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- Returns table
CREATE TABLE public.returns (
  id TEXT PRIMARY KEY,
  sale_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'return',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  exchange_items JSONB,
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT DEFAULT '',
  worker_id TEXT NOT NULL,
  worker_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to returns" ON public.returns FOR ALL USING (true) WITH CHECK (true);

-- Returns log table
CREATE TABLE public.returns_log (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  return_record JSONB NOT NULL,
  action_by TEXT NOT NULL,
  action_date TEXT NOT NULL,
  action_time TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.returns_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to returns_log" ON public.returns_log FOR ALL USING (true) WITH CHECK (true);

-- Insert default data
INSERT INTO public.workers (id, name, role, password, salary) VALUES
  ('admin', 'المدير', 'admin', 'admin123', 5000),
  ('worker1', 'أحمد', 'worker', '1234', 3000);

INSERT INTO public.products (id, name, sell_price, cost_price, category, ingredients) VALUES
  ('1', 'قهوة تركي', 15, 5, 'مشروبات ساخنة', '[{"name":"قهوة خام","cost":2,"inventoryItemId":"1","quantityUsed":0.017},{"name":"سكر","cost":0.5,"inventoryItemId":"3","quantityUsed":0.02},{"name":"كوب ورق صغير","cost":2.5,"inventoryItemId":"5","quantityUsed":1}]'),
  ('2', 'شاي', 10, 3, 'مشروبات ساخنة', '[{"name":"شاي خام","cost":1,"inventoryItemId":"2","quantityUsed":0.013},{"name":"سكر","cost":0.5,"inventoryItemId":"3","quantityUsed":0.02},{"name":"كوب ورق صغير","cost":1.5,"inventoryItemId":"5","quantityUsed":1}]'),
  ('3', 'نسكافيه', 20, 7, 'مشروبات ساخنة', '[{"name":"نسكافيه","cost":3,"inventoryItemId":"6","quantityUsed":0.033},{"name":"لبن","cost":1.5,"inventoryItemId":"7","quantityUsed":0.05},{"name":"كوب ورق كبير","cost":2.5,"inventoryItemId":"4","quantityUsed":1}]'),
  ('4', 'آيس كوفي', 25, 8, 'مشروبات باردة', '[{"name":"قهوة خام","cost":3,"inventoryItemId":"1","quantityUsed":0.025},{"name":"لبن","cost":2,"inventoryItemId":"7","quantityUsed":0.067},{"name":"كوب ورق كبير","cost":2.5,"inventoryItemId":"4","quantityUsed":1}]');

INSERT INTO public.inventory (id, name, unit, quantity, cost_per_unit, category, sell_price) VALUES
  ('1', 'قهوة خام', 'كجم', 5, 120, 'مواد خام', NULL),
  ('2', 'شاي خام', 'كجم', 3, 80, 'مواد خام', NULL),
  ('3', 'سكر', 'كجم', 10, 25, 'مواد خام', NULL),
  ('4', 'أكواب ورق كبيرة', 'علبة', 20, 50, 'أدوات', NULL),
  ('5', 'أكواب ورق صغيرة', 'علبة', 15, 35, 'أدوات', NULL),
  ('6', 'نسكافيه', 'كجم', 4, 90, 'مواد خام', NULL),
  ('7', 'لبن', 'لتر', 20, 30, 'مواد خام', NULL),
  ('8', 'بيبسي', 'علبة', 24, 7, 'مشروبات باردة', 12),
  ('9', 'مياه معدنية', 'علبة', 48, 2.5, 'مياه معدنية', 5),
  ('10', 'عصير برتقال', 'علبة', 12, 8, 'عصائر', 20);
