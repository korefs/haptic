
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from './database/schema';

let dbInstance: ReturnType<typeof drizzle> | null = null;

async function initializeDB() {
  if (!dbInstance) {
    const pglite = new PGlite();
    await pglite.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        content TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    dbInstance = drizzle(pglite, { schema });
  }
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get: (target, prop) => {
		if (!dbInstance) {
      return new Promise(async (resolve) => {
        await initializeDB();
				resolve(dbInstance![prop as keyof typeof dbInstance]);
			});
		}
		return dbInstance[prop as keyof typeof dbInstance];
	}
});
