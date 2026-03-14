import { neon } from '@neondatabase/serverless';

const sql = neon('postgresql://neondb_owner:npg_1jz6VtkgOwCX@ep-cool-haze-am1hclpg-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

export {sql}
