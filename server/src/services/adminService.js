import { queryAll, queryOne, execute } from '../db/database.js';

export class AdminService {
  /**
   * List all registered users with activity stats
   */
  static async listUsers(currentAdminId) {
    const users = await queryAll(`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        COALESCE(u.role, 'user') as role, 
        COALESCE(u.active, 1) as active, 
        u.created_at,
        (SELECT COUNT(*) FROM transactions t WHERE t.user_id = u.id) as transactions_count,
        (SELECT COUNT(*) FROM accounts a WHERE a.user_id = u.id) as accounts_count,
        (SELECT COUNT(*) FROM scheduled_payments sp WHERE sp.user_id = u.id) as scheduled_count
      FROM users u
      ORDER BY 
        CASE WHEN u.id = ? THEN 0 WHEN u.role = 'admin' THEN 1 ELSE 2 END,
        u.created_at DESC
    `, [currentAdminId]);

    return users.map((u) => ({
      ...u,
      active: parseInt(u.active, 10),
      transactions_count: parseInt(u.transactions_count || 0, 10),
      accounts_count: parseInt(u.accounts_count || 0, 10),
      scheduled_count: parseInt(u.scheduled_count || 0, 10),
      isSelf: u.id === currentAdminId
    }));
  }

  /**
   * Deactivate (active = 0) or Reactivate (active = 1) a user
   */
  static async toggleUserStatus(currentAdminId, targetUserId, newActive) {
    const target = await queryOne('SELECT id, name, email, role, active FROM users WHERE id = ?', [targetUserId]);
    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    if (target.id === currentAdminId && newActive === 0) {
      throw new Error('Ação bloqueada: você não pode desativar sua própria conta de administrador.');
    }

    if (target.role === 'admin' && newActive === 0) {
      throw new Error('Ação bloqueada: não é permitido desativar outro administrador.');
    }

    await execute('UPDATE users SET active = ? WHERE id = ?', [newActive, targetUserId]);

    const updated = await queryOne('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [targetUserId]);
    return {
      success: true,
      user: {
        ...updated,
        active: parseInt(updated.active, 10)
      },
      message: newActive === 1 
        ? `Usuário ${target.name} reativado com sucesso!`
        : `Usuário ${target.name} desativado com sucesso!`
    };
  }

  /**
   * Change user role between 'admin' and 'user'
   */
  static async toggleUserRole(currentAdminId, targetUserId, newRole) {
    if (newRole !== 'admin' && newRole !== 'user') {
      throw new Error('Papel inválido. Deve ser "admin" ou "user".');
    }

    const target = await queryOne('SELECT id, name, email, role FROM users WHERE id = ?', [targetUserId]);
    if (!target) {
      throw new Error('Usuário não encontrado.');
    }

    if (target.id === currentAdminId && newRole !== 'admin') {
      throw new Error('Ação bloqueada: você não pode remover seu próprio privilégio de administrador.');
    }

    await execute('UPDATE users SET role = ? WHERE id = ?', [newRole, targetUserId]);

    const updated = await queryOne('SELECT id, name, email, role, active, created_at FROM users WHERE id = ?', [targetUserId]);
    return {
      success: true,
      user: {
        ...updated,
        active: parseInt(updated.active, 10)
      },
      message: `Papel do usuário ${target.name} alterado para ${newRole === 'admin' ? 'Administrador' : 'Usuário comum'}.`
    };
  }
}
