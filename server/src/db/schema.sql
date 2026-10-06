-- Schema for Personal Finance Application
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking', -- checking, savings, cash, wallet, investment
  institution TEXT NOT NULL DEFAULT 'Outro',
  initial_balance REAL NOT NULL DEFAULT 0.0,
  current_balance REAL NOT NULL DEFAULT 0.0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS credit_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  institution TEXT NOT NULL DEFAULT 'Outro',
  credit_limit REAL NOT NULL DEFAULT 1000.0,
  closing_day INTEGER NOT NULL DEFAULT 25,
  due_day INTEGER NOT NULL DEFAULT 5,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense', -- 'expense' or 'income'
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#64748b',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'expense' or 'income'
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT,
  account_id TEXT,
  credit_card_id TEXT,
  payment_method TEXT NOT NULL DEFAULT 'nao_informado', -- pix, dinheiro, debito, credito, boleto, transferencia, nao_informado
  transaction_date TEXT NOT NULL, -- YYYY-MM-DD
  transaction_time TEXT NOT NULL DEFAULT '12:00:00',
  notes TEXT,
  recurring_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed', -- completed, pending
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  source_account_id TEXT NOT NULL,
  destination_account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT 'Transferência entre contas',
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (source_account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category_id TEXT,
  account_id TEXT,
  credit_card_id TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- daily, weekly, monthly, yearly
  due_day INTEGER NOT NULL DEFAULT 10,
  start_date TEXT NOT NULL,
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  FOREIGN KEY (credit_card_id) REFERENCES credit_cards(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL,
  month INTEGER NOT NULL, -- 1 to 12
  year INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  UNIQUE(user_id, category_id, month, year)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user', 'assistant', 'system'
  content TEXT NOT NULL,
  metadata TEXT, -- JSON string with parsed action, entities, tags
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS conversation_context (
  user_id TEXT PRIMARY KEY,
  last_transaction_id TEXT,
  pending_action TEXT, -- e.g. 'confirm_delete', 'clarify_category', 'clarify_account'
  pending_payload TEXT, -- JSON string
  updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_trans_user_date ON transactions(user_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_trans_user_category ON transactions(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_trans_user_account ON transactions(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_trans_user_card ON transactions(user_id, credit_card_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_date ON transfers(user_id, date);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_transactions(user_id, active);
CREATE INDEX IF NOT EXISTS idx_budgets_user_my ON budgets(user_id, year, month);
CREATE INDEX IF NOT EXISTS idx_chat_user_created ON chat_messages(user_id, created_at);
