import { Product, Sale, InventoryItem, Worker, AttendanceRecord, WorkerTransaction, Expense, ReturnRecord, ReturnLogEntry, ItemCategory, ShiftResetRecord } from './types';
import { supabase } from '@/integrations/supabase/client';

const STORAGE_KEYS = {
  products: 'cafe_products',
  sales: 'cafe_sales',
  inventory: 'cafe_inventory',
  workers: 'cafe_workers',
  attendance: 'cafe_attendance',
  currentUser: 'cafe_current_user',
  transactions: 'cafe_transactions',
  expenses: 'cafe_expenses',
  returns: 'cafe_returns',
  returnsLog: 'cafe_returns_log',
};

const AUTO_BACKUP_KEY = 'cafe_auto_backup';
const AUTO_BACKUP_TIME_KEY = 'cafe_auto_backup_time';
const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000;

const BACKUP_DATA_KEYS = [
  'cafe_products', 'cafe_sales', 'cafe_inventory', 'cafe_workers',
  'cafe_attendance', 'cafe_transactions', 'cafe_expenses', 'cafe_returns', 'cafe_returns_log',
];

const DB_INITIALIZED_KEY = 'cafe_db_initialized';

export const performAutoBackup = (): boolean => {
  const backupData: Record<string, any> = {};
  BACKUP_DATA_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) backupData[key] = JSON.parse(val);
  });
  backupData._meta = {
    version: 1,
    date: new Date().toISOString(),
    app: 'بن العميد',
    type: 'auto',
  };
  localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(backupData));
  localStorage.setItem(AUTO_BACKUP_TIME_KEY, new Date().toISOString());
  return true;
};

export const getLastAutoBackupTime = (): string | null => {
  return localStorage.getItem(AUTO_BACKUP_TIME_KEY);
};

export const downloadAutoBackup = () => {
  const data = localStorage.getItem(AUTO_BACKUP_KEY);
  if (!data) return false;
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `نسخه احتياطيه العميد ${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  return true;
};

export const checkAndRunAutoBackup = (): boolean => {
  const lastBackup = localStorage.getItem(AUTO_BACKUP_TIME_KEY);
  if (!lastBackup) {
    performAutoBackup();
    return true;
  }
  const elapsed = Date.now() - new Date(lastBackup).getTime();
  if (elapsed >= AUTO_BACKUP_INTERVAL) {
    performAutoBackup();
    return true;
  }
  return false;
};

let autoBackupTimer: ReturnType<typeof setInterval> | null = null;
export const startAutoBackupScheduler = (onBackupDone?: () => void) => {
  const ran = checkAndRunAutoBackup();
  if (ran && onBackupDone) onBackupDone();
  if (autoBackupTimer) clearInterval(autoBackupTimer);
  autoBackupTimer = setInterval(() => {
    const didRun = checkAndRunAutoBackup();
    if (didRun && onBackupDone) onBackupDone();
  }, 60 * 60 * 1000);
};

function getLocal<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ============ Database Sync Layer ============

// Initialize: load all data from Supabase into localStorage
export const initializeFromDatabase = async (): Promise<boolean> => {
  try {
    const [
      { data: workers },
      { data: products },
      { data: inventory },
      { data: sales },
      { data: attendance },
      { data: transactions },
      { data: expenses },
      { data: returns },
      { data: returnsLog },
    ] = await Promise.all([
      supabase.from('workers').select('*'),
      supabase.from('products').select('*'),
      supabase.from('inventory').select('*'),
      supabase.from('sales').select('*'),
      supabase.from('attendance').select('*'),
      supabase.from('transactions').select('*'),
      supabase.from('expenses').select('*'),
      supabase.from('returns').select('*'),
      supabase.from('returns_log').select('*'),
    ]);

    if (workers) setLocal(STORAGE_KEYS.workers, workers.map(dbWorkerToLocal));
    if (products) setLocal(STORAGE_KEYS.products, products.map(dbProductToLocal));
    if (inventory) setLocal(STORAGE_KEYS.inventory, inventory.map(dbInventoryToLocal));
    if (sales) setLocal(STORAGE_KEYS.sales, sales.map(dbSaleToLocal));
    if (attendance) setLocal(STORAGE_KEYS.attendance, attendance.map(dbAttendanceToLocal));
    if (transactions) setLocal(STORAGE_KEYS.transactions, transactions.map(dbTransactionToLocal));
    if (expenses) setLocal(STORAGE_KEYS.expenses, expenses.map(dbExpenseToLocal));
    if (returns) setLocal(STORAGE_KEYS.returns, returns.map(dbReturnToLocal));
    if (returnsLog) setLocal(STORAGE_KEYS.returnsLog, returnsLog.map(dbReturnLogToLocal));

    // Restore current user session if it existed
    const currentUser = getLocal<Worker | null>(STORAGE_KEYS.currentUser, null);
    if (currentUser && workers) {
      const freshWorker = workers.find(w => w.id === currentUser.id);
      if (freshWorker) {
        setLocal(STORAGE_KEYS.currentUser, dbWorkerToLocal(freshWorker));
      }
    }

    localStorage.setItem(DB_INITIALIZED_KEY, 'true');
    return true;
  } catch (err) {
    console.error('Failed to initialize from database:', err);
    return false;
  }
};

// ============ Mappers: DB → Local ============

function dbWorkerToLocal(w: any): Worker {
  return { id: w.id, name: w.name, role: w.role, password: w.password, salary: Number(w.salary) };
}

function dbProductToLocal(p: any): Product {
  return {
    id: p.id, name: p.name, sellPrice: Number(p.sell_price), costPrice: Number(p.cost_price),
    category: p.category, ingredients: p.ingredients || [],
  };
}

function dbInventoryToLocal(i: any): InventoryItem {
  return {
    id: i.id, name: i.name, unit: i.unit, quantity: Number(i.quantity),
    costPerUnit: Number(i.cost_per_unit), category: i.category,
    sellPrice: i.sell_price != null ? Number(i.sell_price) : undefined,
  };
}

function dbSaleToLocal(s: any): Sale {
  return {
    id: s.id, items: s.items || [], total: Number(s.total), discount: s.discount,
    workerId: s.worker_id, workerName: s.worker_name, date: s.date, time: s.time,
  };
}

function dbAttendanceToLocal(a: any): AttendanceRecord {
  return {
    id: a.id, workerId: a.worker_id, workerName: a.worker_name, date: a.date,
    checkIn: a.check_in, checkOut: a.check_out, type: a.type, shift: a.shift,
    hoursWorked: a.hours_worked != null ? Number(a.hours_worked) : undefined,
  };
}

function dbTransactionToLocal(t: any): WorkerTransaction {
  return {
    id: t.id, workerId: t.worker_id, workerName: t.worker_name,
    type: t.type, amount: Number(t.amount), note: t.note || '', date: t.date,
  };
}

function dbExpenseToLocal(e: any): Expense {
  return { id: e.id, name: e.name, amount: Number(e.amount), category: e.category, note: e.note || '', date: e.date };
}

function dbReturnToLocal(r: any): ReturnRecord {
  return {
    id: r.id, saleId: r.sale_id, type: r.type, items: r.items || [],
    exchangeItems: r.exchange_items, refundAmount: Number(r.refund_amount),
    reason: r.reason || '', workerId: r.worker_id, workerName: r.worker_name,
    date: r.date, time: r.time,
  };
}

function dbReturnLogToLocal(l: any): ReturnLogEntry {
  return {
    id: l.id, action: l.action, returnRecord: l.return_record,
    actionBy: l.action_by, actionDate: l.action_date, actionTime: l.action_time,
  };
}

// ============ Async DB write helpers (fire-and-forget) ============

function dbUpsertWorkers(workers: Worker[]) {
  supabase.from('workers').upsert(
    workers.map(w => ({ id: w.id, name: w.name, role: w.role, password: w.password, salary: w.salary })),
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync workers error:', error); });
}

function dbUpsertProducts(products: Product[]) {
  supabase.from('products').upsert(
    products.map(p => ({
      id: p.id, name: p.name, sell_price: p.sellPrice, cost_price: p.costPrice,
      category: p.category || null, ingredients: JSON.parse(JSON.stringify(p.ingredients || [])),
    })) as any,
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync products error:', error); });
}

function dbUpsertInventory(items: InventoryItem[]) {
  supabase.from('inventory').upsert(
    items.map(i => ({
      id: i.id, name: i.name, unit: i.unit, quantity: i.quantity,
      cost_per_unit: i.costPerUnit, sell_price: i.sellPrice ?? null, category: i.category || null,
    })),
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync inventory error:', error); });
}

function dbUpsertSales(sales: Sale[]) {
  if (sales.length === 0) return;
  supabase.from('sales').upsert(
    sales.map(s => ({
      id: s.id, items: JSON.parse(JSON.stringify(s.items)), total: s.total, discount: s.discount ? JSON.parse(JSON.stringify(s.discount)) : null,
      worker_id: s.workerId, worker_name: s.workerName, date: s.date, time: s.time,
    })) as any,
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync sales error:', error); });
}

function dbUpsertAttendance(records: AttendanceRecord[]) {
  if (records.length === 0) return;
  supabase.from('attendance').upsert(
    records.map(a => ({
      id: a.id, worker_id: a.workerId, worker_name: a.workerName, date: a.date,
      check_in: a.checkIn || null, check_out: a.checkOut || null, type: a.type,
      shift: a.shift || null, hours_worked: a.hoursWorked ?? null,
    })),
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync attendance error:', error); });
}

function dbUpsertTransactions(txns: WorkerTransaction[]) {
  if (txns.length === 0) return;
  supabase.from('transactions').upsert(
    txns.map(t => ({
      id: t.id, worker_id: t.workerId, worker_name: t.workerName,
      type: t.type, amount: t.amount, note: t.note, date: t.date,
    })),
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync transactions error:', error); });
}

function dbUpsertExpenses(expenses: Expense[]) {
  if (expenses.length === 0) return;
  supabase.from('expenses').upsert(
    expenses.map(e => ({
      id: e.id, name: e.name, amount: e.amount, category: e.category,
      note: e.note, date: e.date,
    })),
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync expenses error:', error); });
}

function dbUpsertReturns(returns: ReturnRecord[]) {
  if (returns.length === 0) return;
  supabase.from('returns').upsert(
    returns.map(r => ({
      id: r.id, sale_id: r.saleId, type: r.type, items: JSON.parse(JSON.stringify(r.items)),
      exchange_items: r.exchangeItems ? JSON.parse(JSON.stringify(r.exchangeItems)) : null, refund_amount: r.refundAmount,
      reason: r.reason, worker_id: r.workerId, worker_name: r.workerName,
      date: r.date, time: r.time,
    })) as any,
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync returns error:', error); });
}

function dbUpsertReturnsLog(log: ReturnLogEntry[]) {
  if (log.length === 0) return;
  supabase.from('returns_log').upsert(
    log.map(l => ({
      id: l.id, action: l.action, return_record: JSON.parse(JSON.stringify(l.returnRecord)),
      action_by: l.actionBy, action_date: l.actionDate, action_time: l.actionTime,
    })) as any,
    { onConflict: 'id' }
  ).then(({ error }) => { if (error) console.error('DB sync returns_log error:', error); });
}

function dbDeleteById(table: string, id: string) {
  (supabase.from(table as any) as any).delete().eq('id', id)
    .then(({ error }: any) => { if (error) console.error(`DB delete ${table} error:`, error); });
}

// ============ Public API (same signatures as before) ============

// Products
export const getProducts = (): Product[] => getLocal(STORAGE_KEYS.products, defaultProducts);
export const setProducts = (p: Product[]) => { setLocal(STORAGE_KEYS.products, p); dbUpsertProducts(p); };

// Sales
export const getSales = (): Sale[] => getLocal(STORAGE_KEYS.sales, []);
export const setSales = (s: Sale[]) => {
  setLocal(STORAGE_KEYS.sales, s);
  // Full replace: delete all then upsert
  (supabase.from('sales') as any).delete().neq('id', '').then(() => { if (s.length > 0) dbUpsertSales(s); });
};
export const addSale = (sale: Sale) => {
  const sales = getSales();
  sales.push(sale);
  setLocal(STORAGE_KEYS.sales, sales);
  dbUpsertSales([sale]);
};
export const deleteSale = (id: string) => {
  const sales = getSales().filter(s => s.id !== id);
  setLocal(STORAGE_KEYS.sales, sales);
  dbDeleteById('sales', id);
};
export const updateSale = (updated: Sale) => {
  const sales = getSales().map(s => s.id === updated.id ? updated : s);
  setLocal(STORAGE_KEYS.sales, sales);
  dbUpsertSales([updated]);
};

// Inventory
export const getInventory = (): InventoryItem[] => getLocal(STORAGE_KEYS.inventory, defaultInventory);
export const setInventory = (inv: InventoryItem[]) => { setLocal(STORAGE_KEYS.inventory, inv); dbUpsertInventory(inv); };

// Workers
export const getWorkers = (): Worker[] => getLocal(STORAGE_KEYS.workers, defaultWorkers);
export const setWorkers = (w: Worker[]) => { setLocal(STORAGE_KEYS.workers, w); dbUpsertWorkers(w); };

// Attendance
export const getAttendance = (): AttendanceRecord[] => getLocal(STORAGE_KEYS.attendance, []);
export const setAttendance = (a: AttendanceRecord[]) => {
  setLocal(STORAGE_KEYS.attendance, a);
  (supabase.from('attendance') as any).delete().neq('id', '').then(() => { if (a.length > 0) dbUpsertAttendance(a); });
};

// Current User
export const getCurrentUser = (): Worker | null => getLocal(STORAGE_KEYS.currentUser, null);
export const setCurrentUser = (u: Worker | null) => setLocal(STORAGE_KEYS.currentUser, u);

// Worker Transactions
export const getTransactions = (): WorkerTransaction[] => getLocal(STORAGE_KEYS.transactions, []);
export const setTransactions = (t: WorkerTransaction[]) => {
  setLocal(STORAGE_KEYS.transactions, t);
  (supabase.from('transactions') as any).delete().neq('id', '').then(() => { if (t.length > 0) dbUpsertTransactions(t); });
};
export const addTransaction = (t: WorkerTransaction) => {
  const txns = getTransactions();
  txns.push(t);
  setLocal(STORAGE_KEYS.transactions, txns);
  dbUpsertTransactions([t]);
};

// Expenses
export const getExpenses = (): Expense[] => getLocal(STORAGE_KEYS.expenses, []);
export const setExpenses = (e: Expense[]) => {
  setLocal(STORAGE_KEYS.expenses, e);
  (supabase.from('expenses') as any).delete().neq('id', '').then(() => { if (e.length > 0) dbUpsertExpenses(e); });
};
export const addExpense = (e: Expense) => {
  const expenses = getExpenses();
  expenses.push(e);
  setLocal(STORAGE_KEYS.expenses, expenses);
  dbUpsertExpenses([e]);
};
export const deleteExpense = (id: string) => {
  const expenses = getExpenses().filter(e => e.id !== id);
  setLocal(STORAGE_KEYS.expenses, expenses);
  dbDeleteById('expenses', id);
};

// Returns
export const getReturns = (): ReturnRecord[] => getLocal(STORAGE_KEYS.returns, []);
export const setReturns = (r: ReturnRecord[]) => {
  setLocal(STORAGE_KEYS.returns, r);
  (supabase.from('returns') as any).delete().neq('id', '').then(() => { if (r.length > 0) dbUpsertReturns(r); });
};
export const addReturn = (r: ReturnRecord) => {
  const returns = getReturns();
  returns.push(r);
  setLocal(STORAGE_KEYS.returns, returns);
  dbUpsertReturns([r]);
  // Log the creation
  const user = getCurrentUser();
  const now = new Date();
  addReturnLogEntry({
    id: Date.now().toString(),
    action: 'created',
    returnRecord: r,
    actionBy: user?.name || 'غير معروف',
    actionDate: now.toISOString().split('T')[0],
    actionTime: now.toLocaleTimeString('ar-EG'),
  });
};
export const deleteReturn = (id: string) => {
  const returns = getReturns();
  const deleted = returns.find(r => r.id === id);
  if (deleted) {
    const user = getCurrentUser();
    const now = new Date();
    addReturnLogEntry({
      id: Date.now().toString(),
      action: 'deleted',
      returnRecord: deleted,
      actionBy: user?.name || 'غير معروف',
      actionDate: now.toISOString().split('T')[0],
      actionTime: now.toLocaleTimeString('ar-EG'),
    });
  }
  setLocal(STORAGE_KEYS.returns, returns.filter(r => r.id !== id));
  dbDeleteById('returns', id);
};

// Returns Log
export const getReturnsLog = (): ReturnLogEntry[] => getLocal(STORAGE_KEYS.returnsLog, []);
export const setReturnsLog = (log: ReturnLogEntry[]) => {
  setLocal(STORAGE_KEYS.returnsLog, log);
  (supabase.from('returns_log') as any).delete().neq('id', '').then(() => { if (log.length > 0) dbUpsertReturnsLog(log); });
};
export const addReturnLogEntry = (entry: ReturnLogEntry) => {
  const log = getReturnsLog();
  log.push(entry);
  setLocal(STORAGE_KEYS.returnsLog, log);
  dbUpsertReturnsLog([entry]);
};

// Sync all localStorage data UP to Cloud (used after restoring a backup)
export const syncLocalStorageToCloud = async (): Promise<boolean> => {
  try {
    const workers = getWorkers();
    const products = getProducts();
    const inventory = getInventory();
    const sales = getSales();
    const attendance = getAttendance();
    const transactions = getTransactions();
    const expenses = getExpenses();
    const returns = getReturns();
    const returnsLog = getReturnsLog();

    // Delete all existing cloud data first, then upsert
    await Promise.all([
      (supabase.from('workers') as any).delete().neq('id', ''),
      (supabase.from('products') as any).delete().neq('id', ''),
      (supabase.from('inventory') as any).delete().neq('id', ''),
      (supabase.from('sales') as any).delete().neq('id', ''),
      (supabase.from('attendance') as any).delete().neq('id', ''),
      (supabase.from('transactions') as any).delete().neq('id', ''),
      (supabase.from('expenses') as any).delete().neq('id', ''),
      (supabase.from('returns') as any).delete().neq('id', ''),
      (supabase.from('returns_log') as any).delete().neq('id', ''),
    ]);

    // Now upsert all data
    if (workers.length > 0) dbUpsertWorkers(workers);
    if (products.length > 0) dbUpsertProducts(products);
    if (inventory.length > 0) dbUpsertInventory(inventory);
    if (sales.length > 0) dbUpsertSales(sales);
    if (attendance.length > 0) dbUpsertAttendance(attendance);
    if (transactions.length > 0) dbUpsertTransactions(transactions);
    if (expenses.length > 0) dbUpsertExpenses(expenses);
    if (returns.length > 0) dbUpsertReturns(returns);
    if (returnsLog.length > 0) dbUpsertReturnsLog(returnsLog);

    return true;
  } catch (err) {
    console.error('Failed to sync localStorage to cloud:', err);
    return false;
  }
};

// Shift Resets Log
export const addShiftReset = (record: ShiftResetRecord) => {
  supabase.from('shift_resets').upsert([{
    id: record.id,
    worker_id: record.workerId,
    worker_name: record.workerName,
    reset_date: record.resetDate,
    reset_time: record.resetTime,
    report_summary: record.reportSummary || null,
  }] as any, { onConflict: 'id' }).then(({ error }) => {
    if (error) console.error('DB sync shift_resets error:', error);
  });
};

export const getShiftResets = async (): Promise<ShiftResetRecord[]> => {
  const { data, error } = await supabase.from('shift_resets').select('*').order('created_at', { ascending: false });
  if (error) { console.error('Error fetching shift resets:', error); return []; }
  return (data || []).map((r: any) => ({
    id: r.id,
    workerId: r.worker_id,
    workerName: r.worker_name,
    resetDate: r.reset_date,
    resetTime: r.reset_time,
    reportSummary: r.report_summary,
  }));
};

// Default data
const defaultProducts: Product[] = [
  { id: '1', name: 'قهوة تركي', sellPrice: 15, costPrice: 5, category: 'مشروبات ساخنة', ingredients: [
    { name: 'قهوة خام', cost: 2, inventoryItemId: '1', quantityUsed: 0.017 },
    { name: 'سكر', cost: 0.5, inventoryItemId: '3', quantityUsed: 0.02 },
    { name: 'كوب ورق صغير', cost: 2.5, inventoryItemId: '5', quantityUsed: 1 },
  ]},
  { id: '2', name: 'شاي', sellPrice: 10, costPrice: 3, category: 'مشروبات ساخنة', ingredients: [
    { name: 'شاي خام', cost: 1, inventoryItemId: '2', quantityUsed: 0.013 },
    { name: 'سكر', cost: 0.5, inventoryItemId: '3', quantityUsed: 0.02 },
    { name: 'كوب ورق صغير', cost: 1.5, inventoryItemId: '5', quantityUsed: 1 },
  ]},
  { id: '3', name: 'نسكافيه', sellPrice: 20, costPrice: 7, category: 'مشروبات ساخنة', ingredients: [
    { name: 'نسكافيه', cost: 3, inventoryItemId: '6', quantityUsed: 0.033 },
    { name: 'لبن', cost: 1.5, inventoryItemId: '7', quantityUsed: 0.05 },
    { name: 'كوب ورق كبير', cost: 2.5, inventoryItemId: '4', quantityUsed: 1 },
  ]},
  { id: '4', name: 'آيس كوفي', sellPrice: 25, costPrice: 8, category: 'مشروبات باردة', ingredients: [
    { name: 'قهوة خام', cost: 3, inventoryItemId: '1', quantityUsed: 0.025 },
    { name: 'لبن', cost: 2, inventoryItemId: '7', quantityUsed: 0.067 },
    { name: 'كوب ورق كبير', cost: 2.5, inventoryItemId: '4', quantityUsed: 1 },
  ]},
];

const defaultInventory: InventoryItem[] = [
  { id: '1', name: 'قهوة خام', unit: 'كجم', quantity: 5, costPerUnit: 120, category: 'مواد خام' },
  { id: '2', name: 'شاي خام', unit: 'كجم', quantity: 3, costPerUnit: 80, category: 'مواد خام' },
  { id: '3', name: 'سكر', unit: 'كجم', quantity: 10, costPerUnit: 25, category: 'مواد خام' },
  { id: '4', name: 'أكواب ورق كبيرة', unit: 'علبة', quantity: 20, costPerUnit: 50, category: 'أدوات' },
  { id: '5', name: 'أكواب ورق صغيرة', unit: 'علبة', quantity: 15, costPerUnit: 35, category: 'أدوات' },
  { id: '6', name: 'نسكافيه', unit: 'كجم', quantity: 4, costPerUnit: 90, category: 'مواد خام' },
  { id: '7', name: 'لبن', unit: 'لتر', quantity: 20, costPerUnit: 30, category: 'مواد خام' },
  { id: '8', name: 'بيبسي', unit: 'علبة', quantity: 24, costPerUnit: 7, sellPrice: 12, category: 'مشروبات باردة' },
  { id: '9', name: 'مياه معدنية', unit: 'علبة', quantity: 48, costPerUnit: 2.5, sellPrice: 5, category: 'مياه معدنية' },
  { id: '10', name: 'عصير برتقال', unit: 'علبة', quantity: 12, costPerUnit: 8, sellPrice: 20, category: 'عصائر' },
];

const defaultWorkers: Worker[] = [
  { id: 'admin', name: 'المدير', role: 'admin', password: 'admin123', salary: 5000 },
  { id: 'worker1', name: 'أحمد', role: 'worker', password: '1234', salary: 3000 },
];
