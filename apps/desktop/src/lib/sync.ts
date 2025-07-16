import { db } from './database';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { writable } from 'svelte/store';

export interface SyncProvider {
  name: string;
  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUpdates(since: Date): Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pushUpdates(updates: any[]): Promise<void>;
}

export class SupabaseProvider implements SyncProvider {
  public name = 'Supabase';
  private supabase: SupabaseClient | null = null;

  constructor(private url: string, private key: string) {}

  async authenticate(): Promise<void> {
    this.supabase = createClient(this.url, this.key);
    // In a real app, you would handle user login here.
    // For now, we assume the key is enough.
  }

  async isAuthenticated(): Promise<boolean> {
    return !!this.supabase;
  }

  async getUpdates(since: Date): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Not authenticated');
    }
    const { data, error } = await this.supabase
      .from('notes') // Assuming a 'notes' table
      .select('*')
      .gt('updated_at', since.toISOString());

    if (error) {
      throw error;
    }
    return data;
  }

  async pushUpdates(updates: any[]): Promise<void> {
    if (!this.supabase) {
      throw new Error('Not authenticated');
    }
    const { error } = await this.supabase.from('notes').upsert(updates);

    if (error) {
      throw error;
    }
  }
}

export class SyncManager {
  private provider: SyncProvider | null = null;
  private lastSync: Date | null = null;

  setProvider(provider: SyncProvider) {
    this.provider = provider;
  }

  async sync() {
    if (!this.provider) {
      throw new Error('No sync provider set');
    }

    if (!(await this.provider.isAuthenticated())) {
      await this.provider.authenticate();
    }

    const updates = await this.provider.getUpdates(this.lastSync ?? new Date(0));
    // In a real app, you would merge these updates with local data.
    console.log('Got updates:', updates);

    const localChanges = await db.query.entry.findMany();
    await this.provider.pushUpdates(localChanges);

    this.lastSync = new Date();
  }
}

const syncManager = new SyncManager();

// We'll need a way to get the Supabase URL and key
// For now, we'll use placeholders.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY as string;

const provider = new SupabaseProvider(supabaseUrl, supabaseKey);
syncManager.setProvider(provider);

export const isSyncing = writable<boolean>(false);
export const lastSync = writable<Date | null>(null);

let autoSyncInterval: NodeJS.Timeout | null = null;

export function startAutoSync(interval = 5000) {
  if (autoSyncInterval) {
    return;
  }
  console.log('Starting auto sync every', interval, 'ms');

  autoSyncInterval = setInterval(async () => {
    isSyncing.set(true);
    try {
      await syncManager.sync();
      lastSync.set(new Date());
    } catch (error) {
      console.error('Failed to sync:', error);
    } finally {
      isSyncing.set(false);
    }
  }, interval);
}

export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}