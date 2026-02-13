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

function collectBackupData(): Record<string, any> {
  const data: Record<string, any> = {};
  DATA_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) data[key] = JSON.parse(val);
  });
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
  const data = collectBackupData();
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
    const { data, error } = await supabase
      .from('backups')
      .select('backup_data, created_at, id')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return false;
    return await restoreFromBackupData(data.backup_data as Record<string, any>);
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
  DATA_KEYS.forEach(key => {
    if (backupData[key]) {
      localStorage.setItem(key, JSON.stringify(backupData[key]));
    }
  });
  await syncLocalStorageToCloud();
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
  try {
    // Clear cloud data except backups and workers
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
    ]);

    // Clear localStorage except workers and current user
    DATA_KEYS.forEach(key => {
      if (key !== 'cafe_workers') {
        localStorage.removeItem(key);
      }
    });
    localStorage.removeItem('cafe_auto_backup');
    localStorage.removeItem('cafe_auto_backup_time');
    localStorage.removeItem(LAST_BACKUP_TIME_KEY);
    localStorage.removeItem(LAST_DATA_HASH_KEY);
    localStorage.removeItem(OFFLINE_BACKUP_KEY);

    return true;
  } catch {
    return false;
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
