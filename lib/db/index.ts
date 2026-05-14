import { neon } from '@neondatabase/serverless';

const databaseUrl = 'postgresql://neondb_owner:npg_1jz6VtkgOwCX@ep-cool-haze-am1hclpg-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
if (!process.env.DATABASE_URL && process.env.NODE_ENV === 'production') {
  console.warn('DATABASE_URL is not defined');
}

const sql = neon(databaseUrl);

export { sql };
