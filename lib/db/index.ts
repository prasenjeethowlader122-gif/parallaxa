import { neon } from '@neondatabase/serverless';

let client: any = null;

function getClient() {
  if (!client) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('DATABASE_URL is not defined in production');
      }
      // Return a dummy client that will fail if actually used,
      // but allows the Proxy to be created and build to proceed.
      client = neon('');
    } else {
      client = neon(databaseUrl);
    }
  }
  return client;
}

// Lazy-initialized sql client using a Proxy
// This handles both tagged template literals: sql`SELECT...`
// and the .query() method: sql.query(...)
export const sql = new Proxy(() => {}, {
  apply(target, thisArg, argArray) {
    const c = getClient();
    return c(...argArray);
  },
  get(target, prop, receiver) {
    const c = getClient();
    if (prop === 'query') {
      // Specifically bind query to support conventional function calls
      return (...args: any[]) => c.query(...args);
    }
    const value = Reflect.get(c, prop, receiver);
    return typeof value === 'function' ? value.bind(c) : value;
  },
}) as any;
