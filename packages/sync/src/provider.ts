
export interface SyncProvider {
  name: string;
  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getUpdates(since: Date): Promise<any[]>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pushUpdates(updates: any[]): Promise<void>;
}
