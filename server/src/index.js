import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { config } from './config/index.js';
import { initDatabase, isPostgres } from './db/database.js';
import { seedDemoDataIfEmpty } from './db/seed.js';
import { router as apiRouter } from './routes/api.js';
import { ScheduledPaymentService } from './services/scheduledPaymentService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Database (Supabase PostgreSQL in Cloud or Local SQLite) & Seed Data
try {
  await initDatabase();
  await seedDemoDataIfEmpty();
  console.log(`✅ Banco de Dados (${isPostgres ? 'PostgreSQL / Supabase' : 'SQLite'}) inicializado com sucesso!`);
} catch (err) {
  console.error('Erro ao inicializar banco de dados:', err);
}

// Background Payment Checker state
let lastScheduledCheck = 0;
const CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

async function runScheduledPaymentsCheck() {
  const now = Date.now();
  if (now - lastScheduledCheck < 10 * 60 * 1000) return; // Debounce minimum 10 min
  lastScheduledCheck = now;
  try {
    await ScheduledPaymentService.checkDueAndNotifyAll();
  } catch (err) {
    console.error('Erro ao verificar pagamentos agendados:', err);
  }
}

// Initial check 5 seconds after startup
setTimeout(() => {
  runScheduledPaymentsCheck();
}, 5000);

// Recurring periodic check every 30 minutes
setInterval(() => {
  runScheduledPaymentsCheck();
}, CHECK_INTERVAL_MS);

// 2. Setup Express App
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// API Health Check (triggers check if interval elapsed, ensuring execution even on serverless wakeups)
app.get('/api/health', (req, res) => {
  if (Date.now() - lastScheduledCheck >= CHECK_INTERVAL_MS) {
    runScheduledPaymentsCheck().catch(() => {});
  }
  res.json({
    status: 'ok',
    app: 'Assistente Financeiro',
    database: isPostgres ? 'supabase-postgresql' : 'sqlite',
    version: '1.0.0',
    lastScheduledCheck: lastScheduledCheck ? new Date(lastScheduledCheck).toISOString() : null,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api', apiRouter);

// Serve Static Frontend if built
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: 'Erro interno no servidor', details: err.message });
});

app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Assistente Financeiro rodando em http://localhost:${config.port}`);
  console.log(`📊 Banco de Dados conectado: ${isPostgres ? 'Nuvem (Supabase)' : 'Local (SQLite)'}`);
  console.log(`====================================================`);
});
