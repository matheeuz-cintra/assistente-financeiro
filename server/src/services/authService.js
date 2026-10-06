import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { queryOne, execute, transaction } from '../db/database.js';
import { createDefaultCategoriesForUser } from '../db/seed.js';
import { config } from '../config/index.js';
import { EmailService } from './emailService.js';

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

    if (password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres');
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      throw new Error('Já existe um usuário cadastrado com este e-mail');
    }

    const passwordHash = bcrypt.hashSync(password, 8);
    const code = EmailService.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await execute(
      `INSERT INTO email_verifications (email, name, password_hash, code, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP)
       ON CONFLICT(email) DO UPDATE SET 
         name = excluded.name,
         password_hash = excluded.password_hash,
         code = excluded.code,
         expires_at = excluded.expires_at,
         attempts = 0,
         created_at = CURRENT_TIMESTAMP`,
      [cleanEmail, name.trim(), passwordHash, code, expiresAt]
    );

    await EmailService.sendVerificationCode(cleanEmail, code, name.trim());

    return {
      status: 'verification_required',
      email: cleanEmail,
      message: 'Código de verificação enviado para o seu e-mail.'
    };
  }

  static async verifyCode(email, code) {
    if (!email || !code) {
      throw new Error('E-mail e código são obrigatórios');
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = String(code).trim().replace(/\s+/g, '');

    const pending = await queryOne('SELECT * FROM email_verifications WHERE email = ?', [cleanEmail]);
    if (!pending) {
      const alreadyUser = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (alreadyUser) {
        throw new Error('Este e-mail já foi verificado. Faça login para acessar.');
      }
      throw new Error('Nenhuma solicitação de cadastro pendente encontrada para este e-mail');
    }

    const now = new Date();
    const expiresAt = new Date(pending.expires_at);
    if (now > expiresAt) {
      throw new Error('Código expirado. Clique em reenviar código.');
    }

    if (pending.attempts >= 5) {
      throw new Error('Limite de tentativas excedido. Clique em reenviar código.');
    }

    if (pending.code !== cleanCode) {
      await execute('UPDATE email_verifications SET attempts = attempts + 1 WHERE email = ?', [cleanEmail]);
      throw new Error('Código incorreto. Verifique o número e tente novamente.');
    }

    // Code is valid! Create the user in database
    const userId = crypto.randomUUID();
    await transaction(async () => {
      await execute(
        'INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)',
        [userId, pending.name, cleanEmail, pending.password_hash]
      );

      // Initialize all starter accounts, categories, cards and budgets
      await initializeNewUserResources(userId);

      // Remove pending verification
      await execute('DELETE FROM email_verifications WHERE email = ?', [cleanEmail]);
    });

    const token = jwt.sign(
      { id: userId, email: cleanEmail, name: pending.name },
      config.jwtSecret,
      { expiresIn: '30d' }
    );

    return {
      user: { id: userId, name: pending.name, email: cleanEmail },
      token
    };
  }

  static async resendCode(email) {
    if (!email) {
      throw new Error('E-mail é obrigatório');
    }

    const cleanEmail = email.toLowerCase().trim();
    const pending = await queryOne('SELECT * FROM email_verifications WHERE email = ?', [cleanEmail]);
    if (!pending) {
      const alreadyUser = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
      if (alreadyUser) {
        throw new Error('Este e-mail já está verificado. Faça login.');
      }
      throw new Error('Nenhum cadastro pendente para este e-mail. Crie uma nova conta.');
    }

    const newCode = EmailService.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await execute(
      'UPDATE email_verifications SET code = ?, expires_at = ?, attempts = 0 WHERE email = ?',
      [newCode, expiresAt, cleanEmail]
    );

    await EmailService.sendVerificationCode(cleanEmail, newCode, pending.name);

    return {
      success: true,
      message: 'Novo código de verificação enviado para o seu e-mail!'
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
