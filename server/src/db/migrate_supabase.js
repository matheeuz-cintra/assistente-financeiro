import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pw = 'Mt$22012004@Rv';
const encodedPw = encodeURIComponent(pw);
const projectRef = 'mtbnwljjznjvmlnmtzbl';
const host = 'aws-0-us-east-2.pooler.supabase.com';
const connStr = `postgresql://postgres.${projectRef}:${encodedPw}@${host}:5432/postgres`;

async function migrate() {
  console.log('Connecting to Supabase...');
  const client = new Client({
    connectionString: connStr,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected! Applying PostgreSQL schema...');

    const schemaPath = path.join(__dirname, 'schema.postgres.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(sql);
    console.log('✅ All tables and indexes successfully created on Supabase!');

    // Check tables in public schema
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('Tables created in Supabase:');
    res.rows.forEach(r => console.log(' -', r.table_name));

    await client.end();
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  }
}

migrate();
