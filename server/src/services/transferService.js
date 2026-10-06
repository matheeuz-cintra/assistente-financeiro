import crypto from 'node:crypto';
import { queryAll, queryOne, execute, transaction } from '../db/database.js';

export class TransferService {
  static async list(userId) {
    return await queryAll(
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

  static async getById(userId, id) {
    return await queryOne(
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

  static async create(userId, { sourceAccountId, destinationAccountId, amount, date, description }) {
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

    return await transaction(async () => {
      // 1. Check if both accounts exist and belong to user
      const sourceAcc = await queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [sourceAccountId, userId]);
      const destAcc = await queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [destinationAccountId, userId]);
      if (!sourceAcc || !destAcc) {
        throw new Error('Uma ou ambas as contas não foram encontradas');
      }

      // 2. Insert Transfer record
      await execute(
        `INSERT INTO transfers (id, user_id, source_account_id, destination_account_id, amount, date, description)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, userId, sourceAccountId, destinationAccountId, transferAmount, transferDate, desc]
      );

      // 3. Decrease balance from source account
      await execute(
        'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND user_id = ?',
        [transferAmount, sourceAccountId, userId]
      );

      // 4. Increase balance on destination account
      await execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
        [transferAmount, destinationAccountId, userId]
      );

      return await this.getById(userId, id);
    });
  }

  static async delete(userId, id) {
    const existing = await this.getById(userId, id);
    if (!existing) throw new Error('Transferência não encontrada');

    return await transaction(async () => {
      // Revert balances
      await execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
        [existing.amount, existing.source_account_id, userId]
      );
      await execute(
        'UPDATE accounts SET current_balance = current_balance - ? WHERE id = ? AND user_id = ?',
        [existing.amount, existing.destination_account_id, userId]
      );

      await execute('DELETE FROM transfers WHERE id = ? AND user_id = ?', [id, userId]);
      return { success: true };
    });
  }
}
