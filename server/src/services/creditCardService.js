import crypto from 'node:crypto';
import { queryAll, queryOne, execute } from '../db/database.js';

export class CreditCardService {
  static async list(userId) {
    const cards = await queryAll(
      `SELECT * FROM credit_cards WHERE user_id = ? AND active = 1 ORDER BY name ASC`,
      [userId]
    );

    const now = new Date();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const currentYear = now.getFullYear();

    const results = [];
    for (const card of cards) {
      const transRow = await queryOne(
        `SELECT COALESCE(SUM(amount), 0) as used
         FROM transactions
         WHERE user_id = ? AND credit_card_id = ? AND type = 'expense'
           AND strftime('%Y-%m', transaction_date) = ?`,
        [userId, card.id, `${currentYear}-${currentMonth}`]
      );

      const used = transRow ? parseFloat(transRow.used) : 0;
      const limit = parseFloat(card.credit_limit) || 0;
      const available = Math.max(0, limit - used);

      results.push({
        ...card,
        credit_limit: limit,
        limit_used: used,
        limit_available: available,
        current_invoice: used,
        invoice_status: 'open'
      });
    }

    return results;
  }

  static async getById(userId, id) {
    return await queryOne('SELECT * FROM credit_cards WHERE id = ? AND user_id = ?', [id, userId]);
  }

  static async create(userId, { name, institution = 'Outro', credit_limit = 1000, closing_day = 25, due_day = 5 }) {
    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO credit_cards (id, user_id, name, institution, credit_limit, closing_day, due_day, active)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, userId, name.trim(), institution.trim(), parseFloat(credit_limit) || 1000, parseInt(closing_day, 10) || 25, parseInt(due_day, 10) || 5]
    );
    return await this.getById(userId, id);
  }

  static async update(userId, id, { name, institution, credit_limit, closing_day, due_day }) {
    await execute(
      `UPDATE credit_cards
       SET name = COALESCE(?, name),
           institution = COALESCE(?, institution),
           credit_limit = COALESCE(?, credit_limit),
           closing_day = COALESCE(?, closing_day),
           due_day = COALESCE(?, due_day)
       WHERE id = ? AND user_id = ?`,
      [name?.trim(), institution?.trim(), credit_limit, closing_day, due_day, id, userId]
    );
    return await this.getById(userId, id);
  }

  static async delete(userId, id) {
    return await execute('UPDATE credit_cards SET active = 0 WHERE id = ? AND user_id = ?', [id, userId]);
  }
}
