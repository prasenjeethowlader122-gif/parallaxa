import { neon } from '@neondatabase/serverless';

let client: any = null;

function getClient() {
  if (!client) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      if (process.env.NODE_ENV === 'production') {
        console.warn('DATABASE_URL is not defined in production');
      }
      // Return a dummy client that will not throw when initialized with empty string,
      // and returns empty results for queries during build/static generation.
      return {
        query: async () => ({ rows: [] }),
        // Support tagged template literals by returning an empty array
        apply: () => [],
      };
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
    if (typeof c === 'function') {
      return c(...argArray);
    }
    // Fallback for dummy client tagged template usage
    return [];
  },
  get(target, prop, receiver) {
    const c = getClient();
    if (prop === 'query') {
      if (typeof c.query === 'function') {
        return (...args: any[]) => c.query(...args);
      }
      return async () => ({ rows: [] });
    }
    const value = Reflect.get(c, prop, receiver);
    return typeof value === 'function' ? value.bind(c) : value;
  },
}) as any;
