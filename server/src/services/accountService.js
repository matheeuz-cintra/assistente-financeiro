import crypto from 'node:crypto';
import { queryAll, queryOne, execute, transaction } from '../db/database.js';

export class AccountService {
  static list(userId) {
    return queryAll(
      `SELECT a.*,
        (SELECT COUNT(*) FROM transactions t WHERE t.account_id = a.id) as transaction_count
       FROM accounts a
       WHERE a.user_id = ? AND a.active = 1
       ORDER BY a.name ASC`,
      [userId]
    );
  }

  static getById(userId, id) {
    return queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [id, userId]);
  }

  static create(userId, { name, type = 'checking', institution = 'Outro', initial_balance = 0 }) {
    const id = crypto.randomUUID();
    const balance = parseFloat(initial_balance) || 0;
    execute(
      `INSERT INTO accounts (id, user_id, name, type, institution, initial_balance, current_balance, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, userId, name.trim(), type, institution.trim(), balance, balance]
    );
    return this.getById(userId, id);
  }

  static update(userId, id, { name, type, institution, current_balance }) {
    const current = this.getById(userId, id);
    if (!current) throw new Error('Conta não encontrada');

    execute(
      `UPDATE accounts 
       SET name = COALESCE(?, name),
           type = COALESCE(?, type),
           institution = COALESCE(?, institution),
           current_balance = COALESCE(?, current_balance)
       WHERE id = ? AND user_id = ?`,
      [name?.trim(), type, institution?.trim(), current_balance, id, userId]
    );

    return this.getById(userId, id);
  }

  static delete(userId, id) {
    // Soft delete to preserve transaction foreign integrity or hard delete
    return execute('UPDATE accounts SET active = 0 WHERE id = ? AND user_id = ?', [id, userId]);
  }
}
