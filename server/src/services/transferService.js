import crypto from 'node:crypto';
import { queryAll, queryOne, execute, transaction } from '../db/database.js';

export class TransferService {
  static list(userId) {
    return queryAll(
      `SELECT t.*,
              sa.name as source_account_name, sa.institution as source_institution,
              da.name as destination_account_name, da.institution as destination_institution
       FROM transfers t
       JOIN accounts sa ON t.source_account_id = sa.id
       JOIN accounts da ON t.destination_account_id = da.id
       WHERE t.user_id = ?
       ORDER BY t.date DESC, t.created_at DESC`,
      [userId]
    );
  }

  static getById(userId, id) {
    return queryOne(
      `SELECT t.*,
              sa.name as source_account_name,
              da.name as destination_account_name
       FROM transfers t
       JOIN accounts sa ON t.source_account_id = sa.id
       JOIN accounts da ON t.destination_account_id = da.id
       WHERE t.id = ? AND t.user_id = ?`,
      [id, userId]
    );
  }

  static create(userId, { sourceAccountId, destinationAccountId, amount, date, description }) {
    if (!sourceAccountId || !destinationAccountId) {
      throw new Error('Contas de origem e destino são obrigatórias');
    }
    if (sourceAccountId === destinationAccountId) {
      throw new Error('A conta de origem e destino não podem ser iguais');
    }
    const transferAmount = Math.abs(parseFloat(amount) || 0);
    if (transferAmount <= 0) {
      throw new Error('O valor da transferência deve ser maior que zero');
    }

    const id = crypto.randomUUID();
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const transferDate = date || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    const desc = (description || 'Transferência entre contas').trim();

    return transaction(() => {
      // 1. Check if both accounts exist and belong to user
      const sourceAcc = queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [sourceAccountId, userId]);
      const destAcc = queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [destinationAccountId, userId]);
      if (!sourceAcc || !destAcc) {
        throw new Error('Uma ou ambas as contas não foram encontradas');
      }

      // 2. Insert Transfer record
      execute(
        `INSERT INTO transfers (id, user_id, source_account_id, destination_account_id, amount, date, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, sourceAccountId, destinationAccountId, transferAmount, transferDate, desc]
      );

      // 3. Decrease balance from source account
      execute(
        'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND user_id = ?',
        [transferAmount, sourceAccountId, userId]
      );

      // 4. Increase balance on destination account
      execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
        [transferAmount, destinationAccountId, userId]
      );

      return this.getById(userId, id);
    });
  }

  static delete(userId, id) {
    const existing = this.getById(userId, id);
    if (!existing) throw new Error('Transferência não encontrada');

    return transaction(() => {
      // Revert balances
      execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
        [existing.amount, existing.source_account_id, userId]
      );
      execute(
        'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND user_id = ?',
        [existing.amount, existing.destination_account_id, userId]
      );

      execute('DELETE FROM transfers WHERE id = ? AND user_id = ?', [id, userId]);
      return { success: true };
    });
  }
}
