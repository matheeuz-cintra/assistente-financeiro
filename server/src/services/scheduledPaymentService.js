import crypto from 'node:crypto';
import { queryAll, queryOne, execute, transaction } from '../db/database.js';
import { TransactionService } from './transactionService.js';
import { NotificationService } from './notificationService.js';
import { EmailService } from './emailService.js';

function getTodayBRT() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // 'YYYY-MM-DD'
}

function calculateDiffDays(dueDateStr) {
  const todayStr = getTodayBRT();
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [dy, dm, dd] = dueDateStr.split('-').map(Number);

  const todayDate = new Date(ty, tm - 1, td);
  const dueDate = new Date(dy, dm - 1, dd);

  const diffTime = dueDate.getTime() - todayDate.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

function fmtBRL(val) {
  return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
}

export class ScheduledPaymentService {
  /**
   * Create a scheduled payment
   */
  static async create(userId, data) {
    if (!data.accountId || typeof data.accountId !== 'string' || !data.accountId.trim()) {
      throw new Error('É OBRIGATÓRIO selecionar a conta bancária para o pagamento agendado.');
    }

    const account = await queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [data.accountId, userId]);
    if (!account) {
      throw new Error('Conta bancária selecionada não foi encontrada ou não pertence ao seu usuário.');
    }

    const amount = Math.abs(parseFloat(data.amount) || 0);
    if (!amount || amount <= 0) {
      throw new Error('Informe um valor de pagamento válido maior que zero.');
    }

    const description = (data.description || 'Pagamento Agendado').trim();
    if (!description) {
      throw new Error('Informe uma descrição para o pagamento (ex: Aluguel, Conta de Luz).');
    }

    const dueDate = data.dueDate || data.due_date;
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      throw new Error('Informe uma data de vencimento válida no formato AAAA-MM-DD.');
    }

    const categoryId = data.categoryId || data.category_id || null;
    const notes = data.notes || null;
    const id = crypto.randomUUID();

    await execute(
      `INSERT INTO scheduled_payments 
       (id, user_id, account_id, category_id, description, amount, due_date, status, notes, notified_created, notified_7_days, notified_3_days, notified_due_day)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, 1, 0, 0, 0)`,
      [id, userId, data.accountId, categoryId, description, amount, dueDate, notes]
    );

    const created = await this.getById(userId, id);

    // 1. Dispatch In-App Notification
    const daysDiff = calculateDiffDays(dueDate);
    let timeText = `para o dia ${formatDateBR(dueDate)}`;
    if (daysDiff === 0) timeText = 'para hoje';
    else if (daysDiff === 1) timeText = 'para amanhã';
    else if (daysDiff > 1) timeText = `para daqui a ${daysDiff} dias (${formatDateBR(dueDate)})`;

    await NotificationService.create(userId, {
      title: '📅 Pagamento Agendado',
      message: `Pagamento de ${fmtBRL(amount)} (${description}) agendado na conta ${account.name} ${timeText}.`,
      type: 'payment_created',
      referenceId: id
    });

    // 2. Dispatch Confirmation Email
    const user = await queryOne('SELECT email, name FROM users WHERE id = ?', [userId]);
    if (user?.email) {
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 32px 24px; border: 1px solid #334155; }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .box { background: #0f172a; border-radius: 18px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #94a3b8; }
    .val { color: #ffffff; font-weight: 700; }
    .val-amount { color: #f43f5e; font-size: 18px; font-weight: 900; }
    .notice { font-size: 12px; color: #cbd5e1; background: #334155/60; padding: 12px; border-radius: 12px; line-height: 1.5; margin-bottom: 24px; }
    .btn { display: block; text-align: center; background: #10b981; color: #ffffff; text-decoration: none; padding: 14px; border-radius: 14px; font-weight: 700; font-size: 14px; }
    .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Agendamento Confirmado</div>
    <div class="title">Olá, ${user.name ? user.name.split(' ')[0] : 'Usuário'}! 👋</div>
    <div class="desc">Seu pagamento foi agendado no Assistente Financeiro com sucesso.</div>
    
    <div class="box">
      <div class="row">
        <span class="label">Pagamento:</span>
        <span class="val">${description}</span>
      </div>
      <div class="row">
        <span class="label">Valor:</span>
        <span class="val-amount">${fmtBRL(amount)}</span>
      </div>
      <div class="row">
        <span class="label">Data de Vencimento:</span>
        <span class="val">${formatDateBR(dueDate)}</span>
      </div>
      <div class="row">
        <span class="label">Conta de Pagamento:</span>
        <span class="val">${account.name} (${account.institution})</span>
      </div>
    </div>

    <div class="notice">
      🔔 <strong>Lembrete importante:</strong> Na data do vencimento, o valor <strong>NÃO</strong> será debitado automaticamente. Nós enviaremos um aviso no seu e-mail e no app para você confirmar se o pagamento já foi realizado!
    </div>

    <a href="https://assistente-financeiro-0bed.onrender.com" class="btn">Abrir Assistente Financeiro</a>

    <div class="footer">
      Assistente Financeiro • Notificação de Pagamento Agendado
    </div>
  </div>
</body>
</html>
      `;

      EmailService.sendGenericEmail({
        toEmail: user.email,
        subject: `📅 Pagamento Agendado: ${description} (${fmtBRL(amount)})`,
        htmlContent: emailHtml
      }).catch((err) => console.warn('Email notify error:', err.message));
    }

    return created;
  }

  /**
   * List scheduled payments
   */
  static async list(userId, filters = {}) {
    let sql = `
      SELECT sp.*,
             a.name as account_name, a.institution as account_institution, a.current_balance as account_balance,
             c.name as category_name, c.icon as category_icon, c.color as category_color
      FROM scheduled_payments sp
      LEFT JOIN accounts a ON sp.account_id = a.id
      LEFT JOIN categories c ON sp.category_id = c.id
      WHERE sp.user_id = ?
    `;
    const params = [userId];

    if (filters.status) {
      sql += ' AND sp.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY sp.due_date ASC, sp.created_at ASC';

    const rows = await queryAll(sql, params);
    const todayStr = getTodayBRT();

    return rows.map((r) => {
      const daysDiff = calculateDiffDays(r.due_date);
      let urgency = 'normal'; // 'overdue', 'today', 'soon', 'normal'
      if (r.status === 'pending') {
        if (daysDiff < 0) urgency = 'overdue';
        else if (daysDiff === 0) urgency = 'today';
        else if (daysDiff <= 3) urgency = 'soon';
      }

      return {
        ...r,
        amount: parseFloat(r.amount) || 0,
        account_balance: parseFloat(r.account_balance) || 0,
        daysDiff,
        urgency,
        isOverdue: r.status === 'pending' && daysDiff < 0,
        isDueToday: r.status === 'pending' && daysDiff === 0
      };
    });
  }

  /**
   * Get single scheduled payment by ID
   */
  static async getById(userId, id) {
    const r = await queryOne(
      `SELECT sp.*,
              a.name as account_name, a.institution as account_institution, a.current_balance as account_balance,
              c.name as category_name, c.icon as category_icon, c.color as category_color
       FROM scheduled_payments sp
       LEFT JOIN accounts a ON sp.account_id = a.id
       LEFT JOIN categories c ON sp.category_id = c.id
       WHERE sp.id = ? AND sp.user_id = ?`,
      [id, userId]
    );
    if (!r) return null;

    const daysDiff = calculateDiffDays(r.due_date);
    return {
      ...r,
      amount: parseFloat(r.amount) || 0,
      account_balance: parseFloat(r.account_balance) || 0,
      daysDiff,
      isOverdue: r.status === 'pending' && daysDiff < 0,
      isDueToday: r.status === 'pending' && daysDiff === 0
    };
  }

  /**
   * Confirm Payment: Creates transaction, debits account, updates status to 'paid'
   * Can be executed on due date or at any time before!
   */
  static async confirmPayment(userId, id, { paidDate = null } = {}) {
    const payment = await this.getById(userId, id);
    if (!payment) throw new Error('Pagamento agendado não encontrado.');
    if (payment.status !== 'pending') {
      throw new Error(`Este pagamento já está com status: ${payment.status === 'paid' ? 'Pago' : 'Cancelado'}.`);
    }

    const todayStr = getTodayBRT();
    const actualPaidDate = paidDate || todayStr;

    return await transaction(async () => {
      // 1. Create real expense transaction linked to account
      const tx = await TransactionService.create(userId, {
        amount: payment.amount,
        type: 'expense',
        description: `[Agendado] ${payment.description}`,
        categoryId: payment.category_id,
        accountId: payment.account_id,
        date: actualPaidDate,
        notes: payment.notes
          ? `${payment.notes} • Confirmado de agendamento (${formatDateBR(payment.due_date)})`
          : `Confirmado de pagamento agendado (${formatDateBR(payment.due_date)})`
      });

      // 2. Update scheduled payment
      await execute(
        `UPDATE scheduled_payments 
         SET status = 'paid', paid_date = ?, transaction_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [actualPaidDate, tx.id, id, userId]
      );

      // 3. In-App Notification
      await NotificationService.create(userId, {
        title: '✅ Pagamento Confirmado',
        message: `O pagamento de ${fmtBRL(payment.amount)} (${payment.description}) foi confirmado e debitado de ${payment.account_name}.`,
        type: 'payment_confirmed',
        referenceId: id
      });

      // 4. Send Confirmation Email
      const user = await queryOne('SELECT email, name FROM users WHERE id = ?', [userId]);
      if (user?.email) {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }
    .card { max-width: 500px; margin: 0 auto; background: #1e293b; border-radius: 24px; padding: 32px 24px; border: 1px solid #334155; }
    .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; margin-bottom: 16px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin-bottom: 8px; }
    .desc { font-size: 14px; color: #94a3b8; line-height: 1.6; margin-bottom: 24px; }
    .box { background: #0f172a; border-radius: 18px; padding: 20px; margin-bottom: 24px; border: 1px solid #334155; }
    .row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #94a3b8; }
    .val { color: #ffffff; font-weight: 700; }
    .val-amount { color: #10b981; font-size: 18px; font-weight: 900; }
    .btn { display: block; text-align: center; background: #10b981; color: #ffffff; text-decoration: none; padding: 14px; border-radius: 14px; font-weight: 700; font-size: 14px; }
    .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">Pagamento Concluído</div>
    <div class="title">Pagamento Confirmado! ✅</div>
    <div class="desc">O pagamento agendado foi confirmado e registrado como despesa no seu Assistente Financeiro.</div>
    
    <div class="box">
      <div class="row">
        <span class="label">Descrição:</span>
        <span class="val">${payment.description}</span>
      </div>
      <div class="row">
        <span class="label">Valor Debitado:</span>
        <span class="val-amount">${fmtBRL(payment.amount)}</span>
      </div>
      <div class="row">
        <span class="label">Data do Pagamento:</span>
        <span class="val">${formatDateBR(actualPaidDate)}</span>
      </div>
      <div class="row">
        <span class="label">Conta Debitada:</span>
        <span class="val">${payment.account_name}</span>
      </div>
    </div>

    <a href="https://assistente-financeiro-0bed.onrender.com" class="btn">Ver Meu Saldo Atualizado</a>

    <div class="footer">
      Assistente Financeiro • Confirmação de Pagamento
    </div>
  </div>
</body>
</html>
        `;

        EmailService.sendGenericEmail({
          toEmail: user.email,
          subject: `✅ Pagamento Confirmado: ${payment.description} (${fmtBRL(payment.amount)})`,
          htmlContent: emailHtml
        }).catch((err) => console.warn('Email notify error:', err.message));
      }

      return {
        success: true,
        payment: await this.getById(userId, id),
        transaction: tx
      };
    });
  }

  /**
   * Cancel Payment: Marks status as 'cancelled' without deducting any balance
   * Can be executed at any time!
   */
  static async cancelPayment(userId, id, reason = null) {
    const payment = await this.getById(userId, id);
    if (!payment) throw new Error('Pagamento agendado não encontrado.');
    if (payment.status !== 'pending') {
      throw new Error(`Este pagamento não pode ser cancelado pois está: ${payment.status === 'paid' ? 'Pago' : 'Cancelado'}.`);
    }

    const cancelNotes = reason
      ? (payment.notes ? `${payment.notes} • Cancelado: ${reason}` : `Cancelado: ${reason}`)
      : (payment.notes ? `${payment.notes} • Cancelado pelo usuário` : 'Cancelado pelo usuário');

    await execute(
      `UPDATE scheduled_payments 
       SET status = 'cancelled', notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [cancelNotes, id, userId]
    );

    // In-App Notification
    await NotificationService.create(userId, {
      title: '🚫 Agendamento Cancelado',
      message: `O agendamento de ${fmtBRL(payment.amount)} (${payment.description}) foi cancelado sem debitar da sua conta.`,
      type: 'payment_cancelled',
      referenceId: id
    });

    return { success: true };
  }

  /**
   * Update scheduled payment
   */
  static async update(userId, id, data) {
    const payment = await this.getById(userId, id);
    if (!payment) throw new Error('Pagamento agendado não encontrado.');
    if (payment.status !== 'pending') {
      throw new Error('Apenas pagamentos pendentes podem ser editados.');
    }

    if (data.accountId) {
      const account = await queryOne('SELECT id FROM accounts WHERE id = ? AND user_id = ?', [data.accountId, userId]);
      if (!account) throw new Error('Conta bancária não encontrada.');
    }

    const newAmount = data.amount !== undefined ? Math.abs(parseFloat(data.amount)) : payment.amount;
    const newDesc = data.description !== undefined ? data.description.trim() : payment.description;
    const newDueDate = data.dueDate || data.due_date || payment.due_date;
    const newAccountId = data.accountId || data.account_id || payment.account_id;
    const newCategoryId = data.categoryId !== undefined ? data.categoryId : payment.category_id;
    const newNotes = data.notes !== undefined ? data.notes : payment.notes;

    await execute(
      `UPDATE scheduled_payments
       SET description = ?, amount = ?, due_date = ?, account_id = ?, category_id = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [newDesc, newAmount, newDueDate, newAccountId, newCategoryId, newNotes, id, userId]
    );

    return await this.getById(userId, id);
  }

  /**
   * Delete scheduled payment record
   */
  static async delete(userId, id) {
    const payment = await this.getById(userId, id);
    if (!payment) throw new Error('Pagamento agendado não encontrado.');

    await execute('DELETE FROM scheduled_payments WHERE id = ? AND user_id = ?', [id, userId]);
    return { success: true };
  }

  /**
   * Background Checker: Inspects all pending scheduled payments and dispatches:
   * - 7-day reminder
   * - 3-day reminder
   * - Due-day confirmation question
   */
  static async checkDueAndNotifyAll() {
    console.log('⏰ [ScheduledPayments] Verificando pagamentos agendados e notificações...');

    const pendingPayments = await queryAll(`
      SELECT sp.*,
             u.email as user_email, u.name as user_name,
             a.name as account_name, a.institution as account_institution
      FROM scheduled_payments sp
      JOIN users u ON sp.user_id = u.id
      JOIN accounts a ON sp.account_id = a.id
      WHERE sp.status = 'pending'
    `);

    let countNotified = 0;

    for (const p of pendingPayments) {
      const diffDays = calculateDiffDays(p.due_date);
      const amountFmt = fmtBRL(parseFloat(p.amount) || 0);
      const dateFmt = formatDateBR(p.due_date);

      // 1. Alert 7 Days before
      if (diffDays === 7 && p.notified_7_days === 0) {
        console.log(`🔔 Disparando alerta de 7 dias para ${p.user_email}: ${p.description}`);
        
        await NotificationService.create(p.user_id, {
          title: `⏳ Faltam 7 dias: ${p.description}`,
          message: `O pagamento de ${amountFmt} agendado na conta ${p.account_name} vence em 7 dias (${dateFmt}).`,
          type: 'payment_reminder_7',
          referenceId: p.id
        });

        if (p.user_email) {
          const html = `
            <div style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:24px; border-radius:16px;">
              <h2 style="color:#38bdf8;">⏳ Faltam 7 dias para o vencimento!</h2>
              <p>Olá, <strong>${p.user_name || 'Usuário'}</strong>!</p>
              <p>Lembramos que em <strong>7 dias</strong> vence o seu pagamento agendado:</p>
              <div style="background:#1e293b; padding:16px; border-radius:12px; margin:16px 0;">
                <p><strong>Descrição:</strong> ${p.description}</p>
                <p><strong>Valor:</strong> ${amountFmt}</p>
                <p><strong>Vencimento:</strong> ${dateFmt}</p>
                <p><strong>Conta:</strong> ${p.account_name}</p>
              </div>
              <p><a href="https://assistente-financeiro-0bed.onrender.com" style="background:#10b981; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:bold;">Acessar o Aplicativo</a></p>
            </div>
          `;
          EmailService.sendGenericEmail({
            toEmail: p.user_email,
            subject: `⏳ Faltam 7 dias para o vencimento: ${p.description} (${amountFmt})`,
            htmlContent: html
          }).catch(console.warn);
        }

        await execute('UPDATE scheduled_payments SET notified_7_days = 1 WHERE id = ?', [p.id]);
        countNotified++;
      }

      // 2. Alert 3 Days before
      if (diffDays === 3 && p.notified_3_days === 0) {
        console.log(`🔔 Disparando alerta de 3 dias para ${p.user_email}: ${p.description}`);

        await NotificationService.create(p.user_id, {
          title: `⚠️ Faltam 3 dias: ${p.description}`,
          message: `Atenção: faltam apenas 3 dias para o vencimento de ${amountFmt} (${p.description}) na conta ${p.account_name}.`,
          type: 'payment_reminder_3',
          referenceId: p.id
        });

        if (p.user_email) {
          const html = `
            <div style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:24px; border-radius:16px;">
              <h2 style="color:#fbbf24;">⚠️ Faltam 3 dias para o vencimento!</h2>
              <p>Olá, <strong>${p.user_name || 'Usuário'}</strong>!</p>
              <p>Faltam apenas <strong>3 dias</strong> para o pagamento de:</p>
              <div style="background:#1e293b; padding:16px; border-radius:12px; margin:16px 0;">
                <p><strong>Descrição:</strong> ${p.description}</p>
                <p><strong>Valor:</strong> ${amountFmt}</p>
                <p><strong>Vencimento:</strong> ${dateFmt}</p>
                <p><strong>Conta:</strong> ${p.account_name}</p>
              </div>
              <p><a href="https://assistente-financeiro-0bed.onrender.com" style="background:#10b981; color:#fff; padding:10px 18px; border-radius:10px; text-decoration:none; font-weight:bold;">Ver no Aplicativo</a></p>
            </div>
          `;
          EmailService.sendGenericEmail({
            toEmail: p.user_email,
            subject: `⚠️ Faltam 3 dias para o pagamento: ${p.description} (${amountFmt})`,
            htmlContent: html
          }).catch(console.warn);
        }

        await execute('UPDATE scheduled_payments SET notified_3_days = 1 WHERE id = ?', [p.id]);
        countNotified++;
      }

      // 3. Due Day (Hoje ou vencido): NÃO debita! Pergunta se já realizou!
      if (diffDays <= 0 && p.notified_due_day === 0) {
        console.log(`🔔 Disparando notificação de confirmação no dia do vencimento para ${p.user_email}: ${p.description}`);

        await NotificationService.create(p.user_id, {
          title: `🔔 Pagamento Vence Hoje: ${p.description}`,
          message: `O pagamento de ${amountFmt} (${p.description}) agendado na conta ${p.account_name} vence hoje. Você já realizou este pagamento?`,
          type: 'payment_due_today',
          referenceId: p.id
        });

        if (p.user_email) {
          const html = `
            <div style="font-family:sans-serif; background:#0f172a; color:#f8fafc; padding:24px; border-radius:16px;">
              <h2 style="color:#10b981;">🔔 Seu pagamento vence hoje!</h2>
              <p>Olá, <strong>${p.user_name || 'Usuário'}</strong>!</p>
              <p>Hoje (${dateFmt}) é a data agendada para o pagamento:</p>
              <div style="background:#1e293b; padding:16px; border-radius:12px; margin:16px 0; border: 1px solid #10b981;">
                <p><strong>Descrição:</strong> ${p.description}</p>
                <p style="font-size:20px; color:#10b981;"><strong>Valor:</strong> ${amountFmt}</p>
                <p><strong>Conta:</strong> ${p.account_name}</p>
              </div>
              <p style="font-size:13px; color:#94a3b8;">
                ⚠️ <strong>Atenção:</strong> Por segurança, nós <strong>NÃO</strong> debitamos esse valor automaticamente da sua conta.
              </p>
              <p>Abra o aplicativo para confirmar se o pagamento já foi efetuado ou se deseja cancelar/adiar:</p>
              <p><a href="https://assistente-financeiro-0bed.onrender.com" style="display:inline-block; background:#10b981; color:#fff; padding:12px 24px; border-radius:12px; text-decoration:none; font-weight:bold;">Confirmar no Aplicativo</a></p>
            </div>
          `;
          EmailService.sendGenericEmail({
            toEmail: p.user_email,
            subject: `🔔 Vence Hoje: Você já realizou o pagamento de ${p.description} (${amountFmt})?`,
            htmlContent: html
          }).catch(console.warn);
        }

        await execute('UPDATE scheduled_payments SET notified_due_day = 1 WHERE id = ?', [p.id]);
        countNotified++;
      }
    }

    console.log(`✅ [ScheduledPayments] Verificação concluída. ${countNotified} notificações enviadas.`);
    return { countNotified, totalPending: pendingPayments.length };
  }
}
