// ============ Offline Sync Queue ============
// Stores pending DB operations when offline, flushes when online

import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'cafe_offline_queue';
const QUEUE_LISTENERS_KEY = '_queue_listeners';

export type QueueOperation = {
  id: string;
  type: 'upsert' | 'delete';
  table: string;
  data?: any;
  timestamp: number;
};

// Event system for queue changes
const listeners: (() => void)[] = [];
export const onQueueChange = (cb: () => void) => {
  listeners.push(cb);
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx > -1) listeners.splice(idx, 1);
  };
};
const notifyListeners = () => listeners.forEach(cb => cb());

export const getQueue = (): QueueOperation[] => {
  try {
    const data = localStorage.getItem(QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const getQueueCount = (): number => getQueue().length;

const saveQueue = (queue: QueueOperation[]) => {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  notifyListeners();
};

export const enqueue = (op: Omit<QueueOperation, 'id' | 'timestamp'>) => {
  const queue = getQueue();
  // Deduplicate: for upsert, replace existing op for same table+id
  if (op.type === 'upsert' && op.data) {
    const dataId = Array.isArray(op.data) ? null : op.data?.id;
    if (dataId) {
      const existing = queue.findIndex(q => q.table === op.table && !Array.isArray(q.data) && q.data?.id === dataId);
      if (existing > -1) {
        queue[existing] = { ...queue[existing], data: op.data, timestamp: Date.now() };
        saveQueue(queue);
        return;
      }
    }
  }
  queue.push({ ...op, id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, timestamp: Date.now() });
  saveQueue(queue);
};

const clearQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
  notifyListeners();
};

// Flush all pending operations to Supabase
export const flushQueue = async (): Promise<boolean> => {
  const queue = getQueue();
  if (queue.length === 0) return true;

  let success = true;
  const processed: string[] = [];

  for (const op of queue) {
    try {
      if (op.type === 'upsert' && op.data) {
        const rows = Array.isArray(op.data) ? op.data : [op.data];
        const { error } = await (supabase.from(op.table as any) as any).upsert(rows, { onConflict: 'id' });
        if (error) throw error;
      } else if (op.type === 'delete') {
        const { error } = await (supabase.from(op.table as any) as any).delete().eq('id', op.data);
        if (error) throw error;
      }
      processed.push(op.id);
    } catch (err) {
      console.error(`Queue flush error for ${op.table}:`, err);
      success = false;
      break; // Stop on first error to preserve order
    }
  }

  if (processed.length > 0) {
    const remaining = getQueue().filter(q => !processed.includes(q.id));
    saveQueue(remaining);
  }

  return success;
};

// Start listening for online events to auto-flush
let _flushRegistered = false;
export const startQueueAutoFlush = () => {
  if (_flushRegistered) return;
  _flushRegistered = true;
  window.addEventListener('online', async () => {
    console.log('🌐 Online - flushing offline queue...');
    await flushQueue();
  });
};
