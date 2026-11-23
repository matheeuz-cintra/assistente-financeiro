import crypto from 'node:crypto';
import { queryOne, queryAll, execute, transaction } from '../db/database.js';

export class ProfileService {
  /**
   * Returns default company profiles templates
   */
  static getDefaultProfilesTemplates(userId) {
    return [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Administrador / Dono',
        role_type: 'admin',
        pin: null,
        color: '#8b5cf6',
        icon: '👑',
        can_view_balances: 1,
        can_view_reports: 1,
        can_add_transactions: 1,
        can_edit_delete_transactions: 1,
        can_import_statements: 1,
        can_view_scheduled_payments: 1,
        can_confirm_scheduled_payments: 1,
        can_view_cards: 1,
        can_manage_budgets: 1,
        can_use_ai_assistant: 1,
        can_manage_profiles: 1,
        is_default: 1
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Diretoria / Gestão',
        role_type: 'director',
        pin: null,
        color: '#3b82f6',
        icon: '💼',
        can_view_balances: 1,
        can_view_reports: 1,
        can_add_transactions: 1,
        can_edit_delete_transactions: 1,
        can_import_statements: 1,
        can_view_scheduled_payments: 1,
        can_confirm_scheduled_payments: 1,
        can_view_cards: 1,
        can_manage_budgets: 1,
        can_use_ai_assistant: 1,
        can_manage_profiles: 0,
        is_default: 0
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Financeiro / Contas',
        role_type: 'finance',
        pin: null,
        color: '#10b981',
        icon: '💵',
        can_view_balances: 1,
        can_view_reports: 0,
        can_add_transactions: 1,
        can_edit_delete_transactions: 1,
        can_import_statements: 1,
        can_view_scheduled_payments: 1,
        can_confirm_scheduled_payments: 1,
        can_view_cards: 1,
        can_manage_budgets: 0,
        can_use_ai_assistant: 1,
        can_manage_profiles: 0,
        is_default: 0
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Operador de Caixa / Vendas',
        role_type: 'operator',
        pin: null,
        color: '#f59e0b',
        icon: '🛒',
        can_view_balances: 0,
        can_view_reports: 0,
        can_add_transactions: 1,
        can_edit_delete_transactions: 0,
        can_import_statements: 0,
        can_view_scheduled_payments: 0,
        can_confirm_scheduled_payments: 0,
        can_view_cards: 0,
        can_manage_budgets: 0,
        can_use_ai_assistant: 0,
        can_manage_profiles: 0,
        is_default: 0
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        name: 'Auditor / Consulta',
        role_type: 'auditor',
        pin: null,
        color: '#64748b',
        icon: '🔍',
        can_view_balances: 1,
        can_view_reports: 1,
        can_add_transactions: 0,
        can_edit_delete_transactions: 0,
        can_import_statements: 0,
        can_view_scheduled_payments: 1,
        can_confirm_scheduled_payments: 0,
        can_view_cards: 1,
        can_manage_budgets: 1,
        can_use_ai_assistant: 0,
        can_manage_profiles: 0,
        is_default: 0
      }
    ];
  }

  /**
   * Ensure standard company profiles exist for user
   */
  static async ensureDefaultProfiles(userId) {
    const existing = await queryOne(
      'SELECT COUNT(*) as count FROM company_profiles WHERE user_id = ? AND active = 1',
      [userId]
    );

    const count = parseInt(existing?.count || 0, 10);
    if (count === 0) {
      const templates = this.getDefaultProfilesTemplates(userId);
      for (const p of templates) {
        await execute(
          `INSERT INTO company_profiles (
            id, user_id, name, role_type, pin, color, icon,
            can_view_balances, can_view_reports, can_add_transactions, can_edit_delete_transactions,
            can_import_statements, can_view_scheduled_payments, can_confirm_scheduled_payments,
            can_view_cards, can_manage_budgets, can_use_ai_assistant, can_manage_profiles,
            is_default, active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            p.id, p.user_id, p.name, p.role_type, p.pin, p.color, p.icon,
            p.can_view_balances, p.can_view_reports, p.can_add_transactions, p.can_edit_delete_transactions,
            p.can_import_statements, p.can_view_scheduled_payments, p.can_confirm_scheduled_payments,
            p.can_view_cards, p.can_manage_budgets, p.can_use_ai_assistant, p.can_manage_profiles,
            p.is_default
          ]
        );
      }
    }
  }

  /**
   * List all company profiles for current user account
   */
  static async listProfiles(userId) {
    await this.ensureDefaultProfiles(userId);

    const rows = await queryAll(
      `SELECT 
        id, user_id, name, role_type, color, icon,
        can_view_balances, can_view_reports, can_add_transactions, can_edit_delete_transactions,
        can_import_statements, can_view_scheduled_payments, can_confirm_scheduled_payments,
        can_view_cards, can_manage_budgets, can_use_ai_assistant, can_manage_profiles,
        is_default, active,
        (pin IS NOT NULL AND pin != '') as has_pin,
        created_at
       FROM company_profiles 
       WHERE user_id = ? AND active = 1
       ORDER BY is_default DESC, created_at ASC`,
      [userId]
    );

    return rows.map((r) => ({
      ...r,
      can_view_balances: !!r.can_view_balances,
      can_view_reports: !!r.can_view_reports,
      can_add_transactions: !!r.can_add_transactions,
      can_edit_delete_transactions: !!r.can_edit_delete_transactions,
      can_import_statements: !!r.can_import_statements,
      can_view_scheduled_payments: !!r.can_view_scheduled_payments,
      can_confirm_scheduled_payments: !!r.can_confirm_scheduled_payments,
      can_view_cards: !!r.can_view_cards,
      can_manage_budgets: !!r.can_manage_budgets,
      can_use_ai_assistant: !!r.can_use_ai_assistant,
      can_manage_profiles: !!r.can_manage_profiles,
      is_default: !!r.is_default,
      has_pin: Boolean(r.has_pin)
    }));
  }

  /**
   * Create a new company profile
   */
  static async createProfile(userId, data) {
    const {
      name,
      role_type = 'custom',
      pin = null,
      color = '#10b981',
      icon = '👤',
      can_view_balances = 1,
      can_view_reports = 0,
      can_add_transactions = 1,
      can_edit_delete_transactions = 0,
      can_import_statements = 0,
      can_view_scheduled_payments = 0,
      can_confirm_scheduled_payments = 0,
      can_view_cards = 0,
      can_manage_budgets = 0,
      can_use_ai_assistant = 0,
      can_manage_profiles = 0
    } = data;

    if (!name || !name.trim()) {
      throw new Error('O nome do perfil é obrigatório.');
    }

    const cleanPin = pin ? String(pin).trim() : null;
    if (cleanPin && !/^\d{4}$/.test(cleanPin)) {
      throw new Error('O PIN deve conter exatamente 4 dígitos numéricos.');
    }

    const id = crypto.randomUUID();

    await execute(
      `INSERT INTO company_profiles (
        id, user_id, name, role_type, pin, color, icon,
        can_view_balances, can_view_reports, can_add_transactions, can_edit_delete_transactions,
        can_import_statements, can_view_scheduled_payments, can_confirm_scheduled_payments,
        can_view_cards, can_manage_budgets, can_use_ai_assistant, can_manage_profiles,
        is_default, active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1)`,
      [
        id, userId, name.trim(), role_type, cleanPin, color || '#10b981', icon || '👤',
        can_view_balances ? 1 : 0,
        can_view_reports ? 1 : 0,
        can_add_transactions ? 1 : 0,
        can_edit_delete_transactions ? 1 : 0,
        can_import_statements ? 1 : 0,
        can_view_scheduled_payments ? 1 : 0,
        can_confirm_scheduled_payments ? 1 : 0,
        can_view_cards ? 1 : 0,
        can_manage_budgets ? 1 : 0,
        can_use_ai_assistant ? 1 : 0,
        can_manage_profiles ? 1 : 0
      ]
    );

    return { id, name: name.trim(), success: true };
  }

  /**
   * Update an existing company profile
   */
  static async updateProfile(userId, profileId, data) {
    const existing = await queryOne(
      'SELECT * FROM company_profiles WHERE id = ? AND user_id = ? AND active = 1',
      [profileId, userId]
    );

    if (!existing) {
      throw new Error('Perfil não encontrado.');
    }

    const isAdmin = existing.role_type === 'admin' || existing.is_default === 1;

    const {
      name = existing.name,
      pin, // if undefined, keep existing; if null or empty string, remove; if 4 digits, update
      color = existing.color,
      icon = existing.icon,
      can_view_balances,
      can_view_reports,
      can_add_transactions,
      can_edit_delete_transactions,
      can_import_statements,
      can_view_scheduled_payments,
      can_confirm_scheduled_payments,
      can_view_cards,
      can_manage_budgets,
      can_use_ai_assistant,
      can_manage_profiles
    } = data;

    let updatedPin = existing.pin;
    if (pin !== undefined) {
      if (pin === null || pin === '') {
        updatedPin = null;
      } else {
        const clean = String(pin).trim();
        if (!/^\d{4}$/.test(clean)) {
          throw new Error('O PIN deve conter exatamente 4 dígitos numéricos.');
        }
        updatedPin = clean;
      }
    }

    // Default admin must always retain core management rights
    const finalCanManageProfiles = isAdmin ? 1 : (can_manage_profiles !== undefined ? (can_manage_profiles ? 1 : 0) : existing.can_manage_profiles);
    const finalCanViewBalances = isAdmin ? 1 : (can_view_balances !== undefined ? (can_view_balances ? 1 : 0) : existing.can_view_balances);

    await execute(
      `UPDATE company_profiles SET
        name = ?,
        pin = ?,
        color = ?,
        icon = ?,
        can_view_balances = ?,
        can_view_reports = ?,
        can_add_transactions = ?,
        can_edit_delete_transactions = ?,
        can_import_statements = ?,
        can_view_scheduled_payments = ?,
        can_confirm_scheduled_payments = ?,
        can_view_cards = ?,
        can_manage_budgets = ?,
        can_use_ai_assistant = ?,
        can_manage_profiles = ?,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        name.trim(),
        updatedPin,
        color || existing.color,
        icon || existing.icon,
        finalCanViewBalances,
        can_view_reports !== undefined ? (can_view_reports ? 1 : 0) : existing.can_view_reports,
        can_add_transactions !== undefined ? (can_add_transactions ? 1 : 0) : existing.can_add_transactions,
        can_edit_delete_transactions !== undefined ? (can_edit_delete_transactions ? 1 : 0) : existing.can_edit_delete_transactions,
        can_import_statements !== undefined ? (can_import_statements ? 1 : 0) : existing.can_import_statements,
        can_view_scheduled_payments !== undefined ? (can_view_scheduled_payments ? 1 : 0) : existing.can_view_scheduled_payments,
        can_confirm_scheduled_payments !== undefined ? (can_confirm_scheduled_payments ? 1 : 0) : existing.can_confirm_scheduled_payments,
        can_view_cards !== undefined ? (can_view_cards ? 1 : 0) : existing.can_view_cards,
        can_manage_budgets !== undefined ? (can_manage_budgets ? 1 : 0) : existing.can_manage_budgets,
        can_use_ai_assistant !== undefined ? (can_use_ai_assistant ? 1 : 0) : existing.can_use_ai_assistant,
        finalCanManageProfiles,
        profileId,
        userId
      ]
    );

    return { success: true, message: 'Perfil atualizado com sucesso.' };
  }

  /**
   * Delete custom company profile
   */
  static async deleteProfile(userId, profileId) {
    const existing = await queryOne(
      'SELECT * FROM company_profiles WHERE id = ? AND user_id = ? AND active = 1',
      [profileId, userId]
    );

    if (!existing) {
      throw new Error('Perfil não encontrado.');
    }

    if (existing.role_type === 'admin' || existing.is_default === 1) {
      throw new Error('O perfil de Administrador principal não pode ser excluído.');
    }

    await execute(
      'UPDATE company_profiles SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [profileId, userId]
    );

    return { success: true, message: 'Perfil removido com sucesso.' };
  }

  /**
   * Verify profile PIN
   */
  static async verifyProfilePin(userId, profileId, inputPin) {
    const existing = await queryOne(
      'SELECT pin FROM company_profiles WHERE id = ? AND user_id = ? AND active = 1',
      [profileId, userId]
    );

    if (!existing) {
      throw new Error('Perfil não encontrado.');
    }

    if (!existing.pin) {
      return { valid: true };
    }

    const cleanInput = inputPin ? String(inputPin).trim() : '';
    if (cleanInput === existing.pin) {
      return { valid: true };
    }

    return { valid: false, error: 'PIN incorreto. Tente novamente.' };
  }
}
