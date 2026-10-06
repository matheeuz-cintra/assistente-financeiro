import crypto from 'node:crypto';
import { queryAll, queryOne, execute } from '../db/database.js';

export class CategoryService {
  static async list(userId, type = null) {
    if (type) {
      return await queryAll(
        'SELECT * FROM categories WHERE user_id = ? AND active = 1 AND type = ? ORDER BY name ASC',
        [userId, type]
      );
    }
    return await queryAll(
      'SELECT * FROM categories WHERE user_id = ? AND active = 1 ORDER BY type DESC, name ASC',
      [userId]
    );
  }

  static async getById(userId, id) {
    return await queryOne('SELECT * FROM categories WHERE id = ? AND user_id = ?', [id, userId]);
  }

  static async create(userId, { name, type = 'expense', icon = '📦', color = '#64748b' }) {
    const id = crypto.randomUUID();
    await execute(
      'INSERT INTO categories (id, user_id, name, type, icon, color, active) VALUES (?, ?, ?, ?, ?, ?, 1)',
      [id, userId, name.trim(), type, icon, color]
    );
    return await this.getById(userId, id);
  }

  static async update(userId, id, { name, type, icon, color }) {
    await execute(
      `UPDATE categories
       SET name = COALESCE(?, name),
           type = COALESCE(?, type),
           icon = COALESCE(?, icon),
           color = COALESCE(?, color)
       WHERE id = ? AND user_id = ?`,
      [name?.trim(), type, icon, color, id, userId]
    );
    return await this.getById(userId, id);
  }

  static async delete(userId, id) {
    return await execute('UPDATE categories SET active = 0 WHERE id = ? AND user_id = ?', [id, userId]);
  }
}
