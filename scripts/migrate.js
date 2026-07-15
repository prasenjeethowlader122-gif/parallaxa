'use strict';

const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const databaseUrl = process.env.DATABASE_URL;
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
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`
    await sql`
      CREATE TABLE IF NOT EXISTS reactions (
        id SERIAL PRIMARY KEY,
        article_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(article_id, user_id)
      );
    `;
    
    await sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        article_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT,
        user_image TEXT,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    // Convert article_id in reactions to TEXT if it's currently INTEGER
    try {
      await sql`ALTER TABLE reactions ALTER COLUMN article_id TYPE TEXT;`;
    } catch (e) {
      console.log('Alter reactions table article_id type skipped or already done.');
    }
    
    // Convert article_id in comments to TEXT if it's currently INTEGER
    try {
      await sql`ALTER TABLE comments ALTER COLUMN article_id TYPE TEXT;`;
    } catch (e) {
      console.log('Alter comments table article_id type skipped or already done.');
    }

    // Backfill any missing columns in home_sections
    try {
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS category_id INTEGER;`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS layout TEXT DEFAULT 'grid';`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS limit_count INTEGER DEFAULT 10;`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;`;
      await sql`ALTER TABLE home_sections ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;`;
      console.log('Home sections table columns checked/backfilled.');
    } catch (e) {
      console.error('Alter home_sections table skipped or failed:', e);
    }
    
    console.log('Migrations completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();