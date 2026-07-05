import { neon } from '@neondatabase/serverless';

let _client: any;

export const sql = ((...args: any[]) => {
  if (!_client) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined');
    }
    _client = neon(process.env.DATABASE_URL);
  }
  return _client(...args);
}) as any;
