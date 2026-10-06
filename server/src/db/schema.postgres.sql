-- PostgreSQL Schema for Supabase Cloud Database

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS email_verifications (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'checking',
  institution TEXT NOT NULL DEFAULT 'Outro',
  initial_balance NUMERIC(14,2) NOT NULL DEFAULT 0.0,
  current_balance NUMERIC(14,2) NOT NULL DEFAULT 0.0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  institution TEXT NOT NULL DEFAULT 'Outro',
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 1000.0,
  closing_day INTEGER NOT NULL DEFAULT 25,
  due_day INTEGER NOT NULL DEFAULT 5,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#64748b',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  description TEXT NOT NULL,
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id TEXT REFERENCES credit_cards(id) ON DELETE SET NULL,
  payment_method TEXT NOT NULL DEFAULT 'nao_informado',
  transaction_date TEXT NOT NULL,
  transaction_time TEXT NOT NULL DEFAULT '12:00:00',
  notes TEXT,
  recurring_id TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transfers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  destination_account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  date TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT 'Transferência entre contas',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense',
  category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
  account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
  credit_card_id TEXT REFERENCES credit_cards(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL DEFAULT 'monthly',
  due_day INTEGER NOT NULL DEFAULT 10,
  start_date TEXT NOT NULL,
  end_date TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  amount NUMERIC(14,2) NOT NULL,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, category_id, month, year)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversation_context (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_transaction_id TEXT,
  pending_action TEXT,
  pending_payload TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
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
