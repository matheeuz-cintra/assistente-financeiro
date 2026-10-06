import crypto from 'node:crypto';
import { queryAll, queryOne, execute } from '../db/database.js';

export class BudgetService {
  static getMonthlyBudgets(userId, month, year) {
    const now = new Date();
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const pad = (n) => String(n).padStart(2, '0');
    const monthKey = `${targetYear}-${pad(targetMonth)}`;

    const budgets = queryAll(
      `SELECT b.*,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              COALESCE(
                (SELECT SUM(t.amount)
                 FROM transactions t
                 WHERE t.user_id = b.user_id
                   AND t.category_id = b.category_id
                   AND t.type = 'expense'
                   AND strftime('%Y-%m', t.transaction_date) = ?
                ), 0
              ) as spent
       FROM budgets b
       JOIN categories c ON b.category_id = c.id
       WHERE b.user_id = ? AND b.month = ? AND b.year = ?
       ORDER BY b.amount DESC`,
      [monthKey, userId, targetMonth, targetYear]
    );

    return budgets.map(b => {
      const budgetAmount = b.amount || 0;
      const spent = b.spent || 0;
      const remaining = budgetAmount - spent;
      const percentage = budgetAmount > 0 ? Math.round((spent / budgetAmount) * 1000) / 10 : 0;

      let status = 'normal';
      if (percentage >= 100) {
        status = 'danger';
      } else if (percentage >= 80) {
        status = 'warning';
      }

      return {
        ...b,
        budget_amount: budgetAmount,
        spent_amount: spent,
        remaining_amount: remaining,
        percentage_used: percentage,
        status
      };
    });
  }

  static setBudget(userId, { categoryId, amount, month, year }) {
    const now = new Date();
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const budgetAmount = Math.abs(parseFloat(amount) || 0);

    const existing = queryOne(
      'SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?',
      [userId, categoryId, targetMonth, targetYear]
    );

    if (existing) {
      execute(
        'UPDATE budgets SET amount = ? WHERE id = ? AND user_id = ?',
        [budgetAmount, existing.id, userId]
      );
      return { id: existing.id, updated: true };
    } else {
      const id = crypto.randomUUID();
      execute(
        'INSERT INTO budgets (id, user_id, category_id, amount, month, year) VALUES (?, ?, ?, ?, ?, ?)',
        [id, userId, categoryId, budgetAmount, targetMonth, targetYear]
      );
      return { id, created: true };
    }
  }

  static delete(userId, id) {
    return execute('DELETE FROM budgets WHERE id = ? AND user_id = ?', [id, userId]);
  }
}
