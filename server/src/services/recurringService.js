import crypto from 'node:crypto';
import { queryAll, queryOne, execute } from '../db/database.js';

export class RecurringService {
  static list(userId) {
    return queryAll(
      `SELECT r.*,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              a.name as account_name,
              cc.name as credit_card_name
       FROM recurring_transactions r
       LEFT JOIN categories c ON r.category_id = c.id
       LEFT JOIN accounts a ON r.account_id = a.id
       LEFT JOIN credit_cards cc ON r.credit_card_id = cc.id
       WHERE r.user_id = ?
       ORDER BY r.due_day ASC`,
      [userId]
    );
  }

  static getById(userId, id) {
    return queryOne(
      `SELECT r.*, c.name as category_name, c.icon as category_icon
       FROM recurring_transactions r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.id = ? AND r.user_id = ?`,
      [id, userId]
    );
  }

  static create(userId, { description, amount, type = 'expense', categoryId, accountId, creditCardId, frequency = 'monthly', dueDay = 10, startDate, endDate }) {
    const id = crypto.randomUUID();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const start = startDate || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    execute(
      `INSERT INTO recurring_transactions 
       (id, user_id, description, amount, type, category_id, account_id, credit_card_id, frequency, due_day, start_date, end_date, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        id,
        userId,
        description.trim(),
        Math.abs(parseFloat(amount) || 0),
        type,
        categoryId || null,
        accountId || null,
        creditCardId || null,
        frequency,
        parseInt(dueDay, 10) || 10,
        start,
        endDate || null
      ]
    );

    return this.getById(userId, id);
  }

  static cancel(userId, idOrKeyword) {
    // If it's a UUID
    let item = queryOne('SELECT * FROM recurring_transactions WHERE id = ? AND user_id = ?', [idOrKeyword, userId]);
    
    // If not found by ID, search by keyword in description (e.g. "netflix", "internet")
    if (!item) {
      item = queryOne(
        'SELECT * FROM recurring_transactions WHERE user_id = ? AND description LIKE ? AND active = 1',
        [userId, `%${idOrKeyword}%`]
      );
    }

    if (!item) {
      throw new Error(`Nenhuma assinatura ativa encontrada para "${idOrKeyword}"`);
    }

    execute('UPDATE recurring_transactions SET active = 0 WHERE id = ? AND user_id = ?', [item.id, userId]);
    return { success: true, item };
  }

  static delete(userId, id) {
    return execute('DELETE FROM recurring_transactions WHERE id = ? AND user_id = ?', [id, userId]);
  }
}
