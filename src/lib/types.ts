export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Ingredient {
  name: string;
  cost: number;
  inventoryItemId?: string;
  quantityUsed?: number; // quantity consumed from inventory per unit sold
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  sellPrice: number;
  costPrice: number;
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
