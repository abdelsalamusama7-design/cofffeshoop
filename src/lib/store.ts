import { Product, Sale, InventoryItem, Worker, AttendanceRecord, WorkerTransaction, Expense, ReturnRecord, ReturnLogEntry, ItemCategory } from './types';

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
const AUTO_BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

const BACKUP_DATA_KEYS = [
  'cafe_products', 'cafe_sales', 'cafe_inventory', 'cafe_workers',
  'cafe_attendance', 'cafe_transactions', 'cafe_expenses', 'cafe_returns', 'cafe_returns_log',
];

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
  a.download = `auto-backup-بن-العميد-${new Date().toISOString().slice(0, 10)}.json`;
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

// Start auto-backup interval with notification callback
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

function get<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// Products
export const getProducts = (): Product[] => get(STORAGE_KEYS.products, defaultProducts);
export const setProducts = (p: Product[]) => set(STORAGE_KEYS.products, p);

// Sales
export const getSales = (): Sale[] => get(STORAGE_KEYS.sales, []);
export const setSales = (s: Sale[]) => set(STORAGE_KEYS.sales, s);
export const addSale = (sale: Sale) => {
  const sales = getSales();
  sales.push(sale);
  set(STORAGE_KEYS.sales, sales);
};
export const deleteSale = (id: string) => {
  const sales = getSales().filter(s => s.id !== id);
  set(STORAGE_KEYS.sales, sales);
};
export const updateSale = (updated: Sale) => {
  const sales = getSales().map(s => s.id === updated.id ? updated : s);
  set(STORAGE_KEYS.sales, sales);
};

// Inventory
export const getInventory = (): InventoryItem[] => get(STORAGE_KEYS.inventory, defaultInventory);
export const setInventory = (inv: InventoryItem[]) => set(STORAGE_KEYS.inventory, inv);

// Workers
export const getWorkers = (): Worker[] => get(STORAGE_KEYS.workers, defaultWorkers);
export const setWorkers = (w: Worker[]) => set(STORAGE_KEYS.workers, w);

// Attendance
export const getAttendance = (): AttendanceRecord[] => get(STORAGE_KEYS.attendance, []);
export const setAttendance = (a: AttendanceRecord[]) => set(STORAGE_KEYS.attendance, a);

// Current User
export const getCurrentUser = (): Worker | null => get(STORAGE_KEYS.currentUser, null);
export const setCurrentUser = (u: Worker | null) => set(STORAGE_KEYS.currentUser, u);

// Worker Transactions (advances & bonuses)
export const getTransactions = (): WorkerTransaction[] => get(STORAGE_KEYS.transactions, []);
export const setTransactions = (t: WorkerTransaction[]) => set(STORAGE_KEYS.transactions, t);
export const addTransaction = (t: WorkerTransaction) => {
  const txns = getTransactions();
  txns.push(t);
  set(STORAGE_KEYS.transactions, txns);
};

// Expenses
export const getExpenses = (): Expense[] => get(STORAGE_KEYS.expenses, []);
export const setExpenses = (e: Expense[]) => set(STORAGE_KEYS.expenses, e);
export const addExpense = (e: Expense) => {
  const expenses = getExpenses();
  expenses.push(e);
  set(STORAGE_KEYS.expenses, expenses);
};
export const deleteExpense = (id: string) => {
  const expenses = getExpenses().filter(e => e.id !== id);
  set(STORAGE_KEYS.expenses, expenses);
};

// Returns
export const getReturns = (): ReturnRecord[] => get(STORAGE_KEYS.returns, []);
export const setReturns = (r: ReturnRecord[]) => set(STORAGE_KEYS.returns, r);
export const addReturn = (r: ReturnRecord) => {
  const returns = getReturns();
  returns.push(r);
  set(STORAGE_KEYS.returns, returns);
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
  set(STORAGE_KEYS.returns, returns.filter(r => r.id !== id));
};

// Returns Log
export const getReturnsLog = (): ReturnLogEntry[] => get(STORAGE_KEYS.returnsLog, []);
export const setReturnsLog = (log: ReturnLogEntry[]) => set(STORAGE_KEYS.returnsLog, log);
export const addReturnLogEntry = (entry: ReturnLogEntry) => {
  const log = getReturnsLog();
  log.push(entry);
  set(STORAGE_KEYS.returnsLog, log);
};

// Default data - Products are items that need preparation (multiple ingredients)
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

// Inventory includes everything: raw materials, cups, and sellable items (Pepsi, water, juice)
const defaultInventory: InventoryItem[] = [
  { id: '1', name: 'قهوة خام', unit: 'كجم', quantity: 5, costPerUnit: 120, category: 'مواد خام' },
  { id: '2', name: 'شاي خام', unit: 'كجم', quantity: 3, costPerUnit: 80, category: 'مواد خام' },
  { id: '3', name: 'سكر', unit: 'كجم', quantity: 10, costPerUnit: 25, category: 'مواد خام' },
  { id: '4', name: 'أكواب ورق كبيرة', unit: 'علبة', quantity: 20, costPerUnit: 50, category: 'أدوات' },
  { id: '5', name: 'أكواب ورق صغيرة', unit: 'علبة', quantity: 15, costPerUnit: 35, category: 'أدوات' },
  { id: '6', name: 'نسكافيه', unit: 'كجم', quantity: 4, costPerUnit: 90, category: 'مواد خام' },
  { id: '7', name: 'لبن', unit: 'لتر', quantity: 20, costPerUnit: 30, category: 'مواد خام' },
  // Sellable items (sold directly from inventory)
  { id: '8', name: 'بيبسي', unit: 'علبة', quantity: 24, costPerUnit: 7, sellPrice: 12, category: 'مشروبات باردة' },
  { id: '9', name: 'مياه معدنية', unit: 'علبة', quantity: 48, costPerUnit: 2.5, sellPrice: 5, category: 'مياه معدنية' },
  { id: '10', name: 'عصير برتقال', unit: 'علبة', quantity: 12, costPerUnit: 8, sellPrice: 20, category: 'عصائر' },
];

const defaultWorkers: Worker[] = [
  { id: 'admin', name: 'المدير', role: 'admin', password: 'admin123', salary: 5000 },
  { id: 'worker1', name: 'أحمد', role: 'worker', password: '1234', salary: 3000 },
];
