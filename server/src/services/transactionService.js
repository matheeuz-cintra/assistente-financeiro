import crypto from 'node:crypto';
import { queryAll, queryOne, execute, transaction } from '../db/database.js';

export class TransactionService {
  static async list(userId, filters = {}) {
    let sql = `
      SELECT t.*,
             c.name as category_name, c.icon as category_icon, c.color as category_color,
             a.name as account_name,
             cc.name as credit_card_name
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
      WHERE t.user_id = ?
    `;
    const params = [userId];

    // Filter by type
    if (filters.type && (filters.type === 'expense' || filters.type === 'income')) {
      sql += ' AND t.type = ?';
      params.push(filters.type);
    }

    // Filter by Category
    if (filters.categoryId) {
      sql += ' AND t.category_id = ?';
      params.push(filters.categoryId);
    }

    // Filter by Account
    if (filters.accountId) {
      sql += ' AND t.account_id = ?';
      params.push(filters.accountId);
    }

    // Filter by Credit Card
    if (filters.creditCardId) {
      sql += ' AND t.credit_card_id = ?';
      params.push(filters.creditCardId);
    }

    // Filter by search keyword
    if (filters.search) {
      sql += ' AND (t.description LIKE ? OR t.notes LIKE ?)';
      params.push(`%${filters.search}%`, `%${filters.search}%`);
    }

    // Date filters
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    if (filters.period === 'today') {
      sql += ' AND t.transaction_date = ?';
      params.push(todayStr);
    } else if (filters.period === 'week') {
      const dayOfWeek = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - dayOfWeek);
      const firstDayStr = `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}`;
      sql += ' AND t.transaction_date >= ? AND t.transaction_date <= ?';
      params.push(firstDayStr, todayStr);
    } else if (filters.period === 'month' || (!filters.period && !filters.startDate && !filters.endDate)) {
      const year = filters.year || now.getFullYear();
      const month = pad(filters.month || (now.getMonth() + 1));
      sql += ` AND strftime('%Y-%m', t.transaction_date) = ?`;
      params.push(`${year}-${month}`);
    } else if (filters.startDate && filters.endDate) {
      sql += ' AND t.transaction_date >= ? AND t.transaction_date <= ?';
      params.push(filters.startDate, filters.endDate);
    }

    sql += ' ORDER BY t.transaction_date DESC, t.transaction_time DESC, t.created_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(parseInt(filters.limit, 10));
    }

    const rows = await queryAll(sql, params);
    return rows.map(r => ({
      ...r,
      amount: parseFloat(r.amount) || 0
    }));
  }

  static async getById(userId, id) {
    const r = await queryOne(
      `SELECT t.*,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              a.name as account_name,
              cc.name as credit_card_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, userId]
    );
    if (!r) return null;
    return {
      ...r,
      amount: parseFloat(r.amount) || 0
    };
  }

  static async getLastTransaction(userId) {
    const r = await queryOne(
      `SELECT t.*, c.name as category_name, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC LIMIT 1`,
      [userId]
    );
    if (!r) return null;
    return {
      ...r,
      amount: parseFloat(r.amount) || 0
    };
  }

  static async create(userId, data) {
    const id = crypto.randomUUID();
    const amount = Math.abs(parseFloat(data.amount) || 0);
    const type = data.type === 'income' ? 'income' : 'expense';
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const date = data.date || data.transaction_date || todayStr;
    const time = data.time || data.transaction_time || timeStr;
    const description = (data.description || (type === 'income' ? 'Receita' : 'Despesa')).trim();

    return await transaction(async () => {
      await execute(
        `INSERT INTO transactions 
         (id, user_id, type, amount, description, category_id, account_id, credit_card_id, payment_method, transaction_date, transaction_time, notes, recurring_id, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          userId,
          type,
          amount,
          description,
          data.categoryId || data.category_id || null,
          data.accountId || data.account_id || null,
          data.creditCardId || data.credit_card_id || null,
          data.paymentMethod || data.payment_method || 'nao_informado',
          date,
          time,
          data.notes || null,
          data.recurringId || data.recurring_id || null,
          data.status || 'completed'
        ]
      );

      // Update account balance if account is linked
      const targetAccountId = data.accountId || data.account_id;
      if (targetAccountId) {
        const delta = type === 'income' ? amount : -amount;
        await execute(
          'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
          [delta, targetAccountId, userId]
        );
      }

      // Update conversation context last_transaction_id
      await execute(
        `INSERT INTO conversation_context (user_id, last_transaction_id, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id) DO UPDATE SET last_transaction_id = excluded.last_transaction_id, updated_at = excluded.updated_at`,
        [userId, id]
      );

      return await this.getById(userId, id);
    });
  }

  static async update(userId, id, updates) {
    const existing = await this.getById(userId, id);
    if (!existing) throw new Error('Transação não encontrada');

    return await transaction(async () => {
      const newAmount = updates.amount !== undefined ? Math.abs(parseFloat(updates.amount)) : existing.amount;
      const newType = updates.type || existing.type;
      const newAccountId = updates.accountId !== undefined ? updates.accountId : existing.account_id;

      // Revert previous account balance impact
      if (existing.account_id) {
        const revertDelta = existing.type === 'income' ? -existing.amount : existing.amount;
        await execute(
          'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
          [revertDelta, existing.account_id, userId]
        );
      }

      // Apply new account balance impact
      if (newAccountId) {
        const applyDelta = newType === 'income' ? newAmount : -newAmount;
        await execute(
          'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
          [applyDelta, newAccountId, userId]
        );
      }

      await execute(
        `UPDATE transactions
         SET type = ?,
             amount = ?,
             description = COALESCE(?, description),
             category_id = COALESCE(?, category_id),
             account_id = ?,
             credit_card_id = ?,
             payment_method = COALESCE(?, payment_method),
             transaction_date = COALESCE(?, transaction_date),
             notes = COALESCE(?, notes),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          newType,
          newAmount,
          updates.description ? updates.description.trim() : null,
          updates.categoryId || updates.category_id || null,
          newAccountId,
          updates.creditCardId !== undefined ? updates.creditCardId : existing.credit_card_id,
          updates.paymentMethod || updates.payment_method || null,
          updates.date || updates.transaction_date || null,
          updates.notes !== undefined ? updates.notes : null,
          id,
          userId
        ]
      );

      return await this.getById(userId, id);
    });
  }

  static async delete(userId, id) {
    const existing = await this.getById(userId, id);
    if (!existing) throw new Error('Transação não encontrada');

    return await transaction(async () => {
      // Revert account balance
      if (existing.account_id) {
        const revertDelta = existing.type === 'income' ? -existing.amount : existing.amount;
        await execute(
          'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
          [revertDelta, existing.account_id, userId]
        );
      }

      await execute('DELETE FROM transactions WHERE id = ? AND user_id = ?', [id, userId]);
      return { success: true, deleted: existing };
    });
  }

  static async duplicate(userId, id) {
    const existing = await this.getById(userId, id);
    if (!existing) throw new Error('Transação não encontrada');

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    return await this.create(userId, {
      type: existing.type,
      amount: existing.amount,
      description: `${existing.description} (Cópia)`,
      categoryId: existing.category_id,
      accountId: existing.account_id,
      creditCardId: existing.credit_card_id,
      paymentMethod: existing.payment_method,
      date: todayStr,
      notes: existing.notes
    });
  }
}
