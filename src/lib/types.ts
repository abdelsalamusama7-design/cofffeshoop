export type ItemCategory = 'مشروبات ساخنة' | 'مشروبات باردة' | 'مياه معدنية' | 'عصائر' | 'مواد خام' | 'أدوات' | 'أخرى';

export const ITEM_CATEGORIES: ItemCategory[] = ['مشروبات ساخنة', 'مشروبات باردة', 'مياه معدنية', 'عصائر', 'مواد خام', 'أدوات', 'أخرى'];

export const SELLABLE_CATEGORIES: ItemCategory[] = ['مشروبات ساخنة', 'مشروبات باردة', 'مياه معدنية', 'عصائر', 'أخرى'];

export interface Ingredient {
  name: string;
  cost: number;
  inventoryItemId?: string;
  quantityUsed?: number; // quantity consumed from inventory per unit sold
}

export interface Product {
  id: string;
  name: string;
  sellPrice: number;
  costPrice: number;
  category?: ItemCategory;
  ingredients?: Ingredient[];
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  workerId: string;
  workerName: string;
  date: string;
  time: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  category?: ItemCategory;
  sellPrice?: number; // if set, this item can be sold directly
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  workerId: string;
  workerName: string;
  date: string;
  time: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  costPerUnit: number;
  sellPrice?: number; // if set, this item can be sold directly
}

export interface Worker {
  id: string;
  name: string;
  role: 'admin' | 'worker';
  password: string;
  salary: number;
}

export interface AttendanceRecord {
  id: string;
  workerId: string;
  workerName: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  type: 'present' | 'absent' | 'leave';
  shift?: 'morning' | 'evening';
  hoursWorked?: number;
}

export interface WorkerTransaction {
  id: string;
  workerId: string;
  workerName: string;
  type: 'advance' | 'bonus';
  amount: number;
  note: string;
  date: string;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: string;
  note: string;
  date: string;
}

export interface ReturnRecord {
  id: string;
  saleId: string;
  type: 'return' | 'exchange';
  items: SaleItem[];
  exchangeItems?: SaleItem[];
  refundAmount: number;
  reason: string;
  workerId: string;
  workerName: string;
  date: string;
  time: string;
}
