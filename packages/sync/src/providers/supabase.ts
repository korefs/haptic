import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SyncProvider } from '../provider';

export class SupabaseProvider implements SyncProvider {
  public name = 'Supabase';
  private supabase: SupabaseClient | null = null;

  constructor(private url: string, private key: string) {}

  async authenticate(): Promise<void> {
    this.supabase = createClient(this.url, this.key);
    // request login ?
  }

  async isAuthenticated(): Promise<boolean> {
    return !!this.supabase;
  }

  async getUpdates(since: Date): Promise<any[]> {
    if (!this.supabase) {
      throw new Error('Not authenticated');
    }
    const { data, error } = await this.supabase
      .from('notes')
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
