import crypto from 'node:crypto';
import { queryAll, queryOne, execute } from '../db/database.js';

export class NotificationService {
  static async create(userId, { title, message, type = 'info', referenceId = null, actionUrl = null }) {
    const id = crypto.randomUUID();
    await execute(
      `INSERT INTO in_app_notifications (id, user_id, title, message, type, reference_id, action_url, read)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [id, userId, title, message, type, referenceId, actionUrl]
    );
    return await this.getById(userId, id);
  }

  static async getById(userId, id) {
    return await queryOne(
      'SELECT * FROM in_app_notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  static async list(userId, limit = 50) {
    const rows = await queryAll(
      `SELECT * FROM in_app_notifications 
       WHERE user_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`,
      [userId, limit]
    );
    return rows;
  }

  static async getUnreadCount(userId) {
    const res = await queryOne(
      'SELECT COUNT(*) as count FROM in_app_notifications WHERE user_id = ? AND read = 0',
      [userId]
    );
    return parseInt(res?.count || 0, 10);
  }

  static async markAsRead(userId, id) {
    await execute(
      'UPDATE in_app_notifications SET read = 1 WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return { success: true };
  }

  static async markAllAsRead(userId) {
    await execute(
      'UPDATE in_app_notifications SET read = 1 WHERE user_id = ? AND read = 0',
      [userId]
    );
    return { success: true };
  }

  static async delete(userId, id) {
    await execute(
      'DELETE FROM in_app_notifications WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return { success: true };
  }
}
