import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, execute, transaction } from '../db/database.js';
import { createDefaultCategoriesForUser } from '../db/seed.js';
import { config } from '../config/index.js';

export async function initializeNewUserResources(userId) {
  // 1. Create Default Categories
  await createDefaultCategoriesForUser(userId);

  // 2. Create Default Accounts
  const accNubankId = crypto.randomUUID();
  const accCashId = crypto.randomUUID();

  await execute(
    'INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [accNubankId, userId, 'Nubank Conta', 'checking', 'Nubank', 0.0, 0.0]
  );
  await execute(
    'INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [accCashId, userId, 'Carteira / Dinheiro', 'cash', 'Dinheiro', 0.0, 0.0]
  );

  // 3. Create Default Credit Card
  const cardId = crypto.randomUUID();
  await execute(
    'INSERT INTO credit_cards (id, user_id, name, institution, credit_limit, closing_day, due_day, active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
    [cardId, userId, 'Cartão de Crédito Nubank', 'Nubank', 3500.0, 25, 5]
  );

  // 4. Create Default Budgets for Current Month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const getCatId = async (name) => {
    const row = await queryOne('SELECT id FROM categories WHERE user_id = ? AND name = ?', [userId, name]);
    return row ? row.id : null;
  };

  const starterBudgets = [
    { name: 'Alimentação', amount: 800 },
    { name: 'Mercado', amount: 600 },
    { name: 'Transporte', amount: 400 },
    { name: 'Lazer', amount: 300 }
  ];

  for (const b of starterBudgets) {
    const cId = await getCatId(b.name);
    if (cId) {
      await execute(
        'INSERT INTO budgets (id, user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), userId, cId, b.amount, currentMonth, currentYear]
      );
    }
  }
}

export class AuthService {
  static async register(name, email, password) {
    if (!name || !email || !password) {
      throw new Error('Nome, email e senha são obrigatórios');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      throw new Error('Já existe um usuário cadastrado com este e-mail');
    }

    const userId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 8);

    await transaction(async () => {
      await execute(
        'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        [userId, name.trim(), cleanEmail, passwordHash]
      );

      // Initialize all starter accounts, categories, cards and budgets
      await initializeNewUserResources(userId);
    });

    const token = jwt.sign(
      { id: userId, email: cleanEmail, name: name.trim() },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      user: { id: userId, name: name.trim(), email: cleanEmail },
      token
    };
  }

  static async login(email, password) {
    if (!email || !password) {
      throw new Error('E-mail e senha são obrigatórios');
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    if (!user) {
      throw new Error('Credenciais inválidas');
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      throw new Error('Credenciais inválidas');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      user: { id: user.id, name: user.name, email: user.email },
      token
    };
  }

  static async getProfile(userId) {
    const user = await queryOne('SELECT id, name, email, created_at FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }
    return user;
  }
}
