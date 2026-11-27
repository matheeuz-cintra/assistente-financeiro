import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { queryOne, queryAll, execute } from '../db/database.js';

export class MemberService {
  /**
   * List all members (owner and employees) of a company
   */
  static async listMembers(companyId) {
    const sql = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.active, 
        u.company_id, 
        u.company_profile_id, 
        u.created_at,
        (CASE WHEN u.company_id IS NULL OR u.company_id = u.id THEN 1 ELSE 0 END) AS is_owner,
        cp.name AS profile_name,
        cp.role_type AS profile_role_type,
        cp.color AS profile_color,
        cp.icon AS profile_icon
      FROM users u
      LEFT JOIN company_profiles cp ON cp.id = u.company_profile_id
      WHERE (u.company_id = ? OR u.id = ?)
      ORDER BY (CASE WHEN u.company_id IS NULL OR u.company_id = u.id THEN 1 ELSE 0 END) DESC, u.created_at ASC
    `;

    const members = await queryAll(sql, [companyId, companyId]);

    return members.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      active: m.active ?? 1,
      isOwner: Boolean(m.is_owner),
      companyProfileId: m.company_profile_id,
      profileName: m.profile_name || (m.is_owner ? 'Administrador (Dono)' : 'Sem Perfil'),
      profileRoleType: m.profile_role_type || (m.is_owner ? 'admin' : 'custom'),
      profileColor: m.profile_color || '#8b5cf6',
      profileIcon: m.profile_icon || (m.is_owner ? '👑' : '👤'),
      createdAt: m.created_at
    }));
  }

  /**
   * Create a new employee for the company
   */
  static async createMember(companyId, creatorId, data) {
    const { name, email, password, companyProfileId } = data;

    if (!name || !name.trim()) {
      throw new Error('O nome do funcionário é obrigatório.');
    }

    if (!email || !email.trim()) {
      throw new Error('O e-mail de acesso é obrigatório.');
    }

    const cleanEmail = email.toLowerCase().trim();

    if (!password || password.length < 6) {
      throw new Error('A senha deve ter no mínimo 6 caracteres.');
    }

    // Check if email already exists
    const existing = await queryOne('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      throw new Error('Já existe um usuário cadastrado com este e-mail no sistema.');
    }

    // Verify company profile exists
    let profileId = companyProfileId;
    if (!profileId) {
      // Find operator or default profile
      const defProfile = await queryOne(
        "SELECT id FROM company_profiles WHERE user_id = ? AND (role_type = 'operator' OR is_default = 1) LIMIT 1",
        [companyId]
      );
      profileId = defProfile ? defProfile.id : null;
    } else {
      const validProfile = await queryOne(
        'SELECT id FROM company_profiles WHERE id = ? AND user_id = ?',
        [profileId, companyId]
      );
      if (!validProfile) {
        throw new Error('Perfil de acesso selecionado não encontrado para esta empresa.');
      }
    }

    const memberId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 8);

    await execute(
      `INSERT INTO users (id, name, email, password_hash, role, active, company_id, company_profile_id, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, 'user', 1, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [memberId, name.trim(), cleanEmail, passwordHash, companyId, profileId, creatorId]
    );

    return {
      id: memberId,
      name: name.trim(),
      email: cleanEmail,
      companyId,
      companyProfileId: profileId,
      active: 1
    };
  }

  /**
   * Update an existing employee
   */
  static async updateMember(companyId, memberId, data) {
    // Cannot modify company owner
    if (memberId === companyId) {
      throw new Error('Não é possível alterar o proprietário da empresa através desta tela.');
    }

    const member = await queryOne(
      'SELECT id, email FROM users WHERE id = ? AND company_id = ?',
      [memberId, companyId]
    );

    if (!member) {
      throw new Error('Funcionário não encontrado nesta empresa.');
    }

    const { name, email, password, companyProfileId, active } = data;

    if (!name || !name.trim()) {
      throw new Error('O nome do funcionário é obrigatório.');
    }

    if (!email || !email.trim()) {
      throw new Error('O e-mail é obrigatório.');
    }

    const cleanEmail = email.toLowerCase().trim();

    if (cleanEmail !== member.email) {
      const existing = await queryOne('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, memberId]);
      if (existing) {
        throw new Error('Este e-mail já está sendo utilizado por outro usuário.');
      }
    }

    if (companyProfileId) {
      const validProfile = await queryOne(
        'SELECT id FROM company_profiles WHERE id = ? AND user_id = ?',
        [companyProfileId, companyId]
      );
      if (!validProfile) {
        throw new Error('Perfil de acesso inválido.');
      }
    }

    let sql = `
      UPDATE users 
      SET name = ?, email = ?, company_profile_id = ?, active = ?
    `;
    const params = [name.trim(), cleanEmail, companyProfileId || null, active === undefined ? 1 : Number(active)];

    if (password && password.trim().length >= 6) {
      sql += ', password_hash = ?';
      params.push(bcrypt.hashSync(password.trim(), 8));
    }

    sql += ' WHERE id = ? AND company_id = ?';
    params.push(memberId, companyId);

    await execute(sql, params);

    return { success: true };
  }

  /**
   * Toggle employee active status
   */
  static async toggleMemberActive(companyId, memberId) {
    if (memberId === companyId) {
      throw new Error('Não é possível desativar a conta do proprietário da empresa.');
    }

    const member = await queryOne(
      'SELECT id, active FROM users WHERE id = ? AND company_id = ?',
      [memberId, companyId]
    );

    if (!member) {
      throw new Error('Funcionário não encontrado.');
    }

    const nextState = member.active === 1 ? 0 : 1;
    await execute('UPDATE users SET active = ? WHERE id = ? AND company_id = ?', [nextState, memberId, companyId]);

    return { active: nextState };
  }

  /**
   * Delete an employee
   */
  static async deleteMember(companyId, memberId) {
    if (memberId === companyId) {
      throw new Error('Não é possível excluir a conta do proprietário da empresa.');
    }

    const member = await queryOne(
      'SELECT id FROM users WHERE id = ? AND company_id = ?',
      [memberId, companyId]
    );

    if (!member) {
      throw new Error('Funcionário não encontrado.');
    }

    await execute('DELETE FROM users WHERE id = ? AND company_id = ?', [memberId, companyId]);

    return { success: true };
  }
}
