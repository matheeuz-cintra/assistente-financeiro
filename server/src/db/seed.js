import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { queryOne, execute, transaction } from './database.js';

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍔', color: '#f97316', type: 'expense' },
  { name: 'Mercado', icon: '🛒', color: '#10b981', type: 'expense' },
  { name: 'Transporte', icon: '🚗', color: '#3b82f6', type: 'expense' },
  { name: 'Combustível', icon: '⛽', color: '#eab308', type: 'expense' },
  { name: 'Moradia', icon: '🏠', color: '#8b5cf6', type: 'expense' },
  { name: 'Energia', icon: '⚡', color: '#e11d48', type: 'expense' },
  { name: 'Água', icon: '💧', color: '#06b6d4', type: 'expense' },
  { name: 'Internet', icon: '🌐', color: '#6366f1', type: 'expense' },
  { name: 'Telefone', icon: '📱', color: '#ec4899', type: 'expense' },
  { name: 'Saúde', icon: '💊', color: '#14b8a6', type: 'expense' },
  { name: 'Educação', icon: '🎓', color: '#f59e0b', type: 'expense' },
  { name: 'Lazer', icon: '🎮', color: '#a855f7', type: 'expense' },
  { name: 'Assinaturas', icon: '📺', color: '#64748b', type: 'expense' },
  { name: 'Compras', icon: '🛍️', color: '#d946ef', type: 'expense' },
  { name: 'Viagens', icon: '✈️', color: '#0284c7', type: 'expense' },
  { name: 'Impostos', icon: '🏛️', color: '#78716c', type: 'expense' },
  { name: 'Investimentos', icon: '📈', color: '#22c55e', type: 'expense' },
  { name: 'Salário', icon: '💰', color: '#16a34a', type: 'income' },
  { name: 'Freelance', icon: '💼', color: '#0d9488', type: 'income' },
  { name: 'Outros', icon: '📦', color: '#94a3b8', type: 'expense' }
];

export function createDefaultCategoriesForUser(userId) {
  const insertStmt = `INSERT INTO categories (id, user_id, name, type, icon, color, active) VALUES (?, ?, ?, ?, ?, ?, 1)`;
  for (const cat of DEFAULT_CATEGORIES) {
    execute(insertStmt, [crypto.randomUUID(), userId, cat.name, cat.type, cat.icon, cat.color]);
  }
}

export function seedDemoDataIfEmpty() {
  const existingUser = queryOne('SELECT id FROM users LIMIT 1');
  if (existingUser) {
    return; // Already seeded
  }

  transaction(() => {
    // 1. Create Demo User
    const userId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync('123456', 8);
    execute(
      'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
      [userId, 'Alexandre', 'demo@finai.com', passwordHash]
    );

    // 2. Create Default Categories
    createDefaultCategoriesForUser(userId);

    // Fetch created categories mapping
    const catRows = queryOne(
      'SELECT id FROM categories WHERE user_id = ? AND name = ?',
      [userId, 'Alimentação']
    );

    const getCatId = (name) => {
      const row = queryOne('SELECT id FROM categories WHERE user_id = ? AND name = ?', [userId, name]);
      return row ? row.id : null;
    };

    // 3. Create Default Accounts
    const accNubankId = crypto.randomUUID();
    const accInterId = crypto.randomUUID();
    const accCashId = crypto.randomUUID();

    execute(
      'INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [accNubankId, userId, 'Nubank Conta', 'checking', 'Nubank', 1500.0, 1500.0]
    );
    execute(
      'INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [accInterId, userId, 'Inter Conta', 'checking', 'Inter', 3200.0, 3200.0]
    );
    execute(
      'INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [accCashId, userId, 'Carteira / Dinheiro', 'cash', 'Dinheiro', 120.50, 120.50]
    );

    // 4. Create Credit Cards
    const cardNubankId = crypto.randomUUID();
    const cardInterId = crypto.randomUUID();

    execute(
      'INSERT INTO credit_cards (id, user_id, name, institution, credit_limit, closing_day, due_day, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [cardNubankId, userId, 'Cartão Nubank', 'Nubank', 5000.0, 25, 5]
    );
    execute(
      'INSERT INTO credit_cards (id, user_id, name, institution, credit_limit, closing_day, due_day, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
      [cardInterId, userId, 'Cartão Inter Gold', 'Inter', 3000.0, 20, 28]
    );

    // 5. Create Monthly Budgets for Current Month
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const budgetsData = [
      { name: 'Alimentação', amount: 800 },
      { name: 'Mercado', amount: 600 },
      { name: 'Transporte', amount: 400 },
      { name: 'Lazer', amount: 300 }
    ];

    for (const b of budgetsData) {
      const cId = getCatId(b.name);
      if (cId) {
        execute(
          'INSERT INTO budgets (id, user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?, ?)',
          [crypto.randomUUID(), userId, cId, b.amount, currentMonth, currentYear]
        );
      }
    }

    // 6. Create Recurring Transactions
    execute(
      'INSERT INTO recurring_transactions (id, user_id, description, amount, type, category_id, account_id, credit_card_id, frequency, due_day, start_date, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [crypto.randomUUID(), userId, 'Internet Fibra 500MB', 100.0, 'expense', getCatId('Internet'), accNubankId, null, 'monthly', 10, '2026-01-01']
    );
    execute(
      'INSERT INTO recurring_transactions (id, user_id, description, amount, type, category_id, account_id, credit_card_id, frequency, due_day, start_date, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [crypto.randomUUID(), userId, 'Netflix Premium', 55.90, 'expense', getCatId('Assinaturas'), null, cardNubankId, 'monthly', 15, '2026-01-01']
    );
    execute(
      'INSERT INTO recurring_transactions (id, user_id, description, amount, type, category_id, account_id, credit_card_id, frequency, due_day, start_date, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
      [crypto.randomUUID(), userId, 'Mensalidade Academia SmartFit', 120.0, 'expense', getCatId('Saúde'), null, cardNubankId, 'monthly', 20, '2026-01-01']
    );

    // 7. Seed Demo Transactions (Formatted with realistic dates)
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${currentYear}-${pad(currentMonth)}-${pad(now.getDate())}`;
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    const day5Str = `${currentYear}-${pad(currentMonth)}-05`;
    const day8Str = `${currentYear}-${pad(currentMonth)}-08`;

    // Incomes
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, payment_method, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'income', 6500.0, 'Salário Mensal', getCatId('Salário'), accInterId, 'pix', day5Str, 'Salário referente ao mês']
    );
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, payment_method, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'income', 800.0, 'Projeto Freelance Landing Page', getCatId('Freelance'), accNubankId, 'pix', day8Str, 'Freelance recebido via PIX']
    );

    // Expenses
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, payment_method, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'expense', 1000.0, 'Aluguel do Apartamento', getCatId('Moradia'), accInterId, 'transferencia', day5Str, 'Aluguel mensal']
    );
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, payment_method, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'expense', 120.0, 'Conta de Energia Elétrica', getCatId('Energia'), accNubankId, 'boleto', day8Str, 'Enel']
    );
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, description, category_id, credit_card_id, payment_method, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'expense', 120.80, 'Compras no Pão de Açúcar', getCatId('Mercado'), cardNubankId, 'credito', yesterdayStr, 'Mercado da semana']
    );
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, description, category_id, account_id, payment_method, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'expense', 42.0, 'Almoço no Restaurante Buffet', getCatId('Alimentação'), accNubankId, 'debito', todayStr, 'Almoço com colegas']
    );
    execute(
      `INSERT INTO transactions (id, user_id, type, amount, description, category_id, credit_card_id, payment_method, transaction_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, 'expense', 18.50, 'Corrida Uber Centro', getCatId('Transporte'), cardNubankId, 'credito', todayStr, 'Uber para reunião']
    );

    // 8. Seed a Sample Transfer
    execute(
      `INSERT INTO transfers (id, user_id, source_account_id, destination_account_id, amount, date, description) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), userId, accInterId, accNubankId, 500.0, day8Str, 'Transferência de reserva para Nubank']
    );

    // Recalculate account balances based on transactions & transfers
    // Inter: initial 3200 + 6500 (salario) - 1000 (aluguel) - 500 (transfer out) = 8200
    execute('UPDATE accounts SET current_balance = 8200.0 WHERE id = ?', [accInterId]);
    // Nubank: initial 1500 + 800 (freelance) - 120 (energia) - 42 (almoco) + 500 (transfer in) = 2638
    execute('UPDATE accounts SET current_balance = 2638.0 WHERE id = ?', [accNubankId]);
  });
}
