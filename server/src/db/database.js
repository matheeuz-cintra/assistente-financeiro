import { DatabaseSync } from 'node:sqlite';
import { AsyncLocalStorage } from 'node:async_hooks';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../config/index.js';

const { Pool, types } = pg;

// Parse PostgreSQL numeric (OID 1700) to float automatically
types.setTypeParser(1700, parseFloat);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const isPostgres = !!config.databaseUrl;
const als = new AsyncLocalStorage();

let pool = null;
let sqliteDb = null;

if (isPostgres) {
  console.log('🌐 Conectando ao Banco de Dados na Nuvem (PostgreSQL / Supabase)...');
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
} else {
  console.log('💾 Usando Banco de Dados Local (SQLite)...');
  const dbDir = path.dirname(config.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  sqliteDb = new DatabaseSync(config.dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
}

export function toPgSql(sql) {
  let i = 1;
  let translated = sql.replace(/\?/g, () => `$${i++}`);
  translated = translated.replace(/strftime\('%Y-%m',\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 7)');
  translated = translated.replace(/strftime\('%Y-%m-%d',\s*([^)]+)\)/gi, 'SUBSTR($1, 1, 10)');
  translated = translated.replace(/datetime\('now'(,\s*'localtime')?\)/gi, 'CURRENT_TIMESTAMP');
  return translated;
}

export async function initDatabase() {
  if (isPostgres) {
    const schemaPath = path.join(__dirname, 'schema.postgres.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
    }
  } else {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    sqliteDb.exec(schemaSql);
  }
}

export async function queryAll(sql, params = []) {
  if (isPostgres) {
    const client = als.getStore() || pool;
    const res = await client.query(toPgSql(sql), params);
    return res.rows;
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.all(...params);
  }
}

export async function queryOne(sql, params = []) {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function execute(sql, params = []) {
  if (isPostgres) {
    const client = als.getStore() || pool;
    const res = await client.query(toPgSql(sql), params);
    return { changes: res.rowCount };
  } else {
    const stmt = sqliteDb.prepare(sql);
    return stmt.run(...params);
  }
}

export async function transaction(fn) {
  if (isPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await als.run(client, async () => {
        return await fn();
      });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } else {
    sqliteDb.exec('BEGIN TRANSACTION;');
    try {
      const result = await fn();
      sqliteDb.exec('COMMIT;');
      return result;
    } catch (error) {
      sqliteDb.exec('ROLLBACK;');
      throw error;
    }
  }
}
