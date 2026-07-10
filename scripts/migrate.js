
'use strict';

const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const databaseUrl = 'postgresql://neondb_owner:npg_1jz6VtkgOwCX@ep-cool-haze-am1hclpg-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
  if (!databaseUrl) {
    console.warn('DATABASE_URL is not defined, skipping migrations.');
    return;
  }

  const sql = neon(databaseUrl);
  console.log('Running migrations...');

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS home_sections (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        type TEXT NOT NULL,
        category_id INTEGER,
        layout TEXT DEFAULT 'grid',
        limit_count INTEGER DEFAULT 10,
        order_index INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(article_id, user_id)
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        article_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        user_image TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
