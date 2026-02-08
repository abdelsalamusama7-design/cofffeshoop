import { Product, Sale, Category, InventoryItem, Worker, AttendanceRecord, WorkerTransaction, Expense } from './types';

const STORAGE_KEYS = {
  products: 'cafe_products',
  sales: 'cafe_sales',
  inventory: 'cafe_inventory',
  workers: 'cafe_workers',
  attendance: 'cafe_attendance',
  categories: 'cafe_categories',
  currentUser: 'cafe_current_user',
  transactions: 'cafe_transactions',
  expenses: 'cafe_expenses',
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

// Categories
export const getCategories = (): Category[] => get(STORAGE_KEYS.categories, defaultCategories);
export const setCategories = (cats: Category[]) => set(STORAGE_KEYS.categories, cats);

// Products
export const getProducts = (): Product[] => get(STORAGE_KEYS.products, defaultProducts);
export const setProducts = (p: Product[]) => set(STORAGE_KEYS.products, p);

// Sales
export const getSales = (): Sale[] => get(STORAGE_KEYS.sales, []);
export const addSale = (sale: Sale) => {
  const sales = getSales();
  sales.push(sale);
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

// Default data
const defaultCategories: Category[] = [
  { id: '1', name: 'مشروبات ساخنة', icon: 'Coffee', color: 'cafe-warm' },
  { id: '2', name: 'مشروبات باردة', icon: 'GlassWater', color: 'info' },
  { id: '3', name: 'مياه غازية', icon: 'Wine', color: 'success' },
  { id: '4', name: 'مياه معدنية', icon: 'Droplets', color: 'info' },
  { id: '5', name: 'عصائر', icon: 'CupSoda', color: 'warning' },
];

const defaultProducts: Product[] = [
  { id: '1', name: 'قهوة تركي', categoryId: '1', sellPrice: 15, costPrice: 5, ingredients: [{ name: 'قهوة خام', cost: 2 }, { name: 'سكر', cost: 0.5 }, { name: 'كوب ورق', cost: 2.5 }] },
  { id: '2', name: 'شاي', categoryId: '1', sellPrice: 10, costPrice: 3, ingredients: [{ name: 'شاي خام', cost: 1 }, { name: 'سكر', cost: 0.5 }, { name: 'كوب ورق', cost: 1.5 }] },
  { id: '3', name: 'نسكافيه', categoryId: '1', sellPrice: 20, costPrice: 7, ingredients: [{ name: 'نسكافيه', cost: 3 }, { name: 'لبن', cost: 1.5 }, { name: 'كوب ورق', cost: 2.5 }] },
  { id: '4', name: 'آيس كوفي', categoryId: '2', sellPrice: 25, costPrice: 8, ingredients: [{ name: 'قهوة', cost: 3 }, { name: 'لبن', cost: 2 }, { name: 'ثلج', cost: 0.5 }, { name: 'كوب', cost: 2.5 }] },
  { id: '5', name: 'بيبسي', categoryId: '3', sellPrice: 12, costPrice: 7 },
  { id: '6', name: 'مياه معدنية', categoryId: '4', sellPrice: 5, costPrice: 2.5 },
  { id: '7', name: 'عصير برتقال', categoryId: '5', sellPrice: 20, costPrice: 8 },
];

const defaultInventory: InventoryItem[] = [
  { id: '1', name: 'قهوة خام', unit: 'كجم', quantity: 5, costPerUnit: 120 },
  { id: '2', name: 'شاي خام', unit: 'كجم', quantity: 3, costPerUnit: 80 },
  { id: '3', name: 'سكر', unit: 'كجم', quantity: 10, costPerUnit: 25 },
  { id: '4', name: 'أكواب ورق كبيرة', unit: 'علبة', quantity: 20, costPerUnit: 50 },
  { id: '5', name: 'أكواب ورق صغيرة', unit: 'علبة', quantity: 15, costPerUnit: 35 },
  { id: '6', name: 'نسكافيه', unit: 'برطمان', quantity: 4, costPerUnit: 90 },
  { id: '7', name: 'لبن', unit: 'لتر', quantity: 20, costPerUnit: 30 },
];

const defaultWorkers: Worker[] = [
  { id: 'admin', name: 'المدير', role: 'admin', password: 'admin123', salary: 5000 },
  { id: 'worker1', name: 'أحمد', role: 'worker', password: '1234', salary: 3000 },
];
