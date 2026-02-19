import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser, syncLocalStorageToCloud, initializeFromDatabase } from './store';

const BACKUP_INTERVAL = 60 * 60 * 1000; // 60 minutes
const MAX_BACKUPS = 24;
const LAST_BACKUP_TIME_KEY = 'cafe_last_backup_time';
const LAST_DATA_HASH_KEY = 'cafe_last_data_hash';
const OFFLINE_BACKUP_KEY = 'cafe_offline_pending_backup';
const BACKUP_STATUS_KEY = 'cafe_backup_status'; // 'ok' | timestamp of last success

const DATA_KEYS = [
  'cafe_products', 'cafe_sales', 'cafe_inventory', 'cafe_workers',
  'cafe_attendance', 'cafe_transactions', 'cafe_expenses',
  'cafe_returns', 'cafe_returns_log',
];

let backupTimer: ReturnType<typeof setInterval> | null = null;

// Simple hash to detect changes
function computeDataHash(): string {
  let combined = '';
  DATA_KEYS.forEach(key => {
    combined += localStorage.getItem(key) || '';
  });
  // Simple fast hash
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const chr = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString();
}

async function collectBackupData(): Promise<Record<string, any>> {
  const data: Record<string, any> = {};
  
  // Try localStorage first
  DATA_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed) && parsed.length > 0) {
        data[key] = parsed;
      }
    }
  });

  // If localStorage is missing data, pull from cloud tables
  const cloudTableMap: Record<string, string> = {
    cafe_workers: 'workers',
    cafe_products: 'products',
    cafe_inventory: 'inventory',
    cafe_sales: 'sales',
    cafe_attendance: 'attendance',
    cafe_transactions: 'transactions',
    cafe_expenses: 'expenses',
    cafe_returns: 'returns',
    cafe_returns_log: 'returns_log',
  };

  const missingKeys = DATA_KEYS.filter(key => !data[key] || (Array.isArray(data[key]) && data[key].length === 0));
  
  if (missingKeys.length > 0) {
    const cloudResults = await Promise.all(
      missingKeys
        .filter(key => cloudTableMap[key])
        .map(async key => {
          const { data: rows } = await (supabase.from(cloudTableMap[key] as any) as any).select('*');
          return { key, rows: rows || [] };
        })
    );
    
    cloudResults.forEach(({ key, rows }) => {
      if (rows.length > 0) {
        data[key] = rows;
      }
    });
  }

  data._meta = {
    version: 1,
    date: new Date().toISOString(),
    app: 'بن العميد',
    type: 'auto',
  };
  return data;
}

// Compress JSON using simple approach (stringify without pretty print)
function compressData(data: Record<string, any>): string {
  return JSON.stringify(data);
}

export async function createBackup(): Promise<boolean> {
  const data = await collectBackupData();
  const compressed = compressData(data);
  
  // Check size < 5MB
  if (compressed.length > 5 * 1024 * 1024) {
    console.warn('Backup too large (>5MB), skipping');
    return false;
  }

  const backupId = `backup_${Date.now()}`;
  const user = getCurrentUser();

  try {
    const { error } = await supabase.from('backups').insert({
      id: backupId,
      backup_data: data,
      created_by: user?.name || 'نسخ تلقائي',
    } as any);

    if (error) throw error;

    // Also update 'latest' for backward compat
    await supabase.from('backups').upsert({
      id: 'latest',
      backup_data: data,
      created_by: user?.name || 'نسخ تلقائي',
    } as any, { onConflict: 'id' });

    localStorage.setItem(LAST_BACKUP_TIME_KEY, new Date().toISOString());
    localStorage.setItem(LAST_DATA_HASH_KEY, computeDataHash());
    localStorage.setItem(BACKUP_STATUS_KEY, new Date().toISOString());
    localStorage.removeItem(OFFLINE_BACKUP_KEY);

    // Cleanup old backups
    await cleanupOldBackups();
    return true;
  } catch (err) {
    console.error('Backup upload failed:', err);
    // Store offline
    localStorage.setItem(OFFLINE_BACKUP_KEY, compressed);
    return false;
  }
}

export async function uploadBackup(): Promise<boolean> {
  const pending = localStorage.getItem(OFFLINE_BACKUP_KEY);
  if (!pending) return true;

  try {
    const data = JSON.parse(pending);
    const backupId = `backup_${Date.now()}`;
    const user = getCurrentUser();

    const { error } = await supabase.from('backups').insert({
      id: backupId,
      backup_data: data,
      created_by: user?.name || 'نسخ تلقائي',
    } as any);

    if (error) throw error;

    await supabase.from('backups').upsert({
      id: 'latest',
      backup_data: data,
      created_by: user?.name || 'نسخ تلقائي',
    } as any, { onConflict: 'id' });

    localStorage.removeItem(OFFLINE_BACKUP_KEY);
    localStorage.setItem(BACKUP_STATUS_KEY, new Date().toISOString());
    await cleanupOldBackups();
    return true;
  } catch {
    return false;
  }
}

export async function restoreLatestBackup(): Promise<boolean> {
  try {
    // Get recent backups and find the first one with actual data
    const { data: backups, error } = await supabase
      .from('backups')
      .select('backup_data, created_at, id')
      .neq('id', 'latest')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !backups || backups.length === 0) return false;

    // Find first backup that has meaningful data (not just workers/meta)
    const meaningful = backups.find(b => {
      const bd = b.backup_data as Record<string, any>;
      const dataKeys = ['cafe_products', 'cafe_inventory', 'cafe_sales', 'cafe_expenses', 'cafe_attendance', 'cafe_transactions', 'cafe_returns'];
      return dataKeys.some(k => bd[k] && Array.isArray(bd[k]) && bd[k].length > 0);
    });

    // Fall back to most recent if none have data
    const chosen = meaningful || backups[0];
    return await restoreFromBackupData(chosen.backup_data as Record<string, any>);
  } catch {
    return false;
  }
}

export async function restoreBackupById(backupId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('backup_data')
      .eq('id', backupId)
      .maybeSingle();

    if (error || !data) return false;
    return await restoreFromBackupData(data.backup_data as Record<string, any>);
  } catch {
    return false;
  }
}

async function restoreFromBackupData(backupData: Record<string, any>): Promise<boolean> {
  const keyToTable: Record<string, string> = {
    cafe_workers: 'workers',
    cafe_products: 'products',
    cafe_inventory: 'inventory',
    cafe_sales: 'sales',
    cafe_attendance: 'attendance',
    cafe_transactions: 'transactions',
    cafe_expenses: 'expenses',
    cafe_returns: 'returns',
    cafe_returns_log: 'returns_log',
  };

  // Mappers: convert camelCase localStorage format to snake_case cloud format
  const mappers: Record<string, (row: any) => any> = {
    cafe_inventory: (r) => ({ id: String(r.id), name: r.name, unit: r.unit || '', quantity: r.quantity ?? 0, cost_per_unit: r.costPerUnit ?? r.cost_per_unit ?? 0, sell_price: r.sellPrice ?? r.sell_price ?? null, category: r.category ?? null }),
    cafe_products: (r) => ({ id: String(r.id), name: r.name, sell_price: r.sellPrice ?? r.sell_price ?? 0, cost_price: r.costPrice ?? r.cost_price ?? 0, category: r.category ?? null, ingredients: r.ingredients ?? [] }),
    cafe_workers: (r) => ({ id: r.id, name: r.name, role: r.role ?? 'worker', password: r.password, salary: r.salary ?? 0 }),
    cafe_sales: (r) => ({ id: r.id, date: r.date, time: r.time, items: r.items ?? [], total: r.total ?? 0, worker_id: r.workerId ?? r.worker_id, worker_name: r.workerName ?? r.worker_name, discount: r.discount ?? null }),
    cafe_attendance: (r) => ({ id: r.id, date: r.date, worker_id: r.workerId ?? r.worker_id, worker_name: r.workerName ?? r.worker_name, type: r.type ?? 'present', check_in: r.checkIn ?? r.check_in ?? null, check_out: r.checkOut ?? r.check_out ?? null, hours_worked: r.hoursWorked ?? r.hours_worked ?? null, shift: r.shift ?? null }),
    cafe_transactions: (r) => ({ id: r.id, date: r.date, amount: r.amount ?? 0, type: r.type, worker_id: r.workerId ?? r.worker_id, worker_name: r.workerName ?? r.worker_name, note: r.note ?? '' }),
    cafe_expenses: (r) => ({ id: r.id, date: r.date, name: r.name, amount: r.amount ?? 0, category: r.category ?? '', note: r.note ?? '' }),
    cafe_returns: (r) => ({ id: r.id, date: r.date, time: r.time, sale_id: r.saleId ?? r.sale_id, items: r.items ?? [], exchange_items: r.exchangeItems ?? r.exchange_items ?? null, refund_amount: r.refundAmount ?? r.refund_amount ?? 0, reason: r.reason ?? '', type: r.type ?? 'return', worker_id: r.workerId ?? r.worker_id, worker_name: r.workerName ?? r.worker_name }),
    cafe_returns_log: (r) => ({ id: r.id, action: r.action, action_by: r.actionBy ?? r.action_by, action_date: r.actionDate ?? r.action_date, action_time: r.actionTime ?? r.action_time, return_record: r.returnRecord ?? r.return_record }),
  };

  // Clear all cloud tables (except backups)
  await Promise.all(
    Object.values(keyToTable).map(table =>
      (supabase.from(table as any) as any).delete().neq('id', '')
    )
  );

  // Insert backup data with proper mapping
  const insertPromises: Promise<any>[] = [];
  for (const [localKey, tableName] of Object.entries(keyToTable)) {
    const rows = backupData[localKey];
    if (rows && Array.isArray(rows) && rows.length > 0) {
      const mapper = mappers[localKey];
      const mapped = mapper ? rows.map(mapper) : rows;
      insertPromises.push(
        (supabase.from(tableName as any) as any).upsert(mapped, { onConflict: 'id' })
      );
    }
  }
  await Promise.all(insertPromises);

  // Reload from cloud into localStorage
  await initializeFromDatabase();
  return true;
}

export interface BackupInfo {
  id: string;
  created_at: string;
  created_by: string;
}

export async function listBackups(): Promise<BackupInfo[]> {
  try {
    const { data, error } = await supabase
      .from('backups')
      .select('id, created_at, created_by')
      .neq('id', 'latest')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as BackupInfo[];
  } catch {
    return [];
  }
}

export async function resetLocalSystem(): Promise<boolean> {
  // Step 1: Always clear localStorage immediately (works offline too)
  // Set empty arrays instead of removing keys, so getProducts/getInventory
  // don't fall back to defaultProducts/defaultInventory
  DATA_KEYS.forEach(key => {
    if (key !== 'cafe_workers') {
      localStorage.setItem(key, '[]');
    }
  });
  localStorage.setItem('cafe_worker_expenses', '[]');
  localStorage.removeItem('cafe_auto_backup');
  localStorage.removeItem('cafe_auto_backup_time');
  localStorage.removeItem(LAST_BACKUP_TIME_KEY);
  localStorage.removeItem(LAST_DATA_HASH_KEY);
  localStorage.removeItem(OFFLINE_BACKUP_KEY);

  // Step 2: If online, also clear cloud data
  if (!navigator.onLine) {
    // Mark pending cloud reset to be done when reconnected
    localStorage.setItem('cafe_pending_cloud_reset', 'true');
    return true;
  }

  try {
    await Promise.all([
      supabase.from('sales').delete().neq('id', ''),
      supabase.from('products').delete().neq('id', ''),
      supabase.from('inventory').delete().neq('id', ''),
      supabase.from('expenses').delete().neq('id', ''),
      supabase.from('attendance').delete().neq('id', ''),
      supabase.from('transactions').delete().neq('id', ''),
      supabase.from('returns').delete().neq('id', ''),
      supabase.from('returns_log').delete().neq('id', ''),
      supabase.from('shift_resets').delete().neq('id', ''),
      supabase.from('worker_expenses').delete().neq('id', ''),
    ]);
    localStorage.removeItem('cafe_pending_cloud_reset');
    return true;
  } catch {
    localStorage.setItem('cafe_pending_cloud_reset', 'true');
    return true; // Still return true since local was cleared
  }
}

export async function cleanupOldBackups(): Promise<void> {
  try {
    const { data } = await supabase
      .from('backups')
      .select('id, created_at')
      .neq('id', 'latest')
      .order('created_at', { ascending: false });

    if (!data || data.length <= MAX_BACKUPS) return;

    const toDelete = data.slice(MAX_BACKUPS).map(b => b.id);
    if (toDelete.length > 0) {
      await supabase.from('backups').delete().in('id', toDelete);
    }
  } catch (err) {
    console.error('Cleanup old backups failed:', err);
  }
}

export function getLastBackupTime(): string | null {
  return localStorage.getItem(LAST_BACKUP_TIME_KEY);
}

export function getBackupStatus(): 'ok' | 'warning' | 'error' {
  const lastSuccess = localStorage.getItem(BACKUP_STATUS_KEY);
  if (!lastSuccess) return 'warning';
  const elapsed = Date.now() - new Date(lastSuccess).getTime();
  if (elapsed > 2 * 60 * 60 * 1000) return 'error'; // > 2 hours
  return 'ok';
}

export function startAutoBackup(onDone?: (success: boolean) => void): void {
  if (backupTimer) clearInterval(backupTimer);

  const runBackup = async () => {
    // Check if data changed
    const currentHash = computeDataHash();
    const lastHash = localStorage.getItem(LAST_DATA_HASH_KEY);
    if (lastHash === currentHash) {
      // No changes, skip
      return;
    }

    // Try uploading pending offline backup first
    if (localStorage.getItem(OFFLINE_BACKUP_KEY)) {
      const uploaded = await uploadBackup();
      if (uploaded) {
        onDone?.(true);
        return;
      }
    }

    const success = await createBackup();
    onDone?.(success);
  };

  // Run immediately on start
  runBackup();

  // Then every 60 minutes
  backupTimer = setInterval(runBackup, BACKUP_INTERVAL);

  // Listen for online event to upload pending backups
  window.addEventListener('online', async () => {
    if (localStorage.getItem(OFFLINE_BACKUP_KEY)) {
      const ok = await uploadBackup();
      if (ok) onDone?.(true);
    }
  });
}

export function stopAutoBackup(): void {
  if (backupTimer) {
    clearInterval(backupTimer);
    backupTimer = null;
  }
}
