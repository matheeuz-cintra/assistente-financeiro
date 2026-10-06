import crypto from 'node:crypto';
import { queryAll, queryOne, execute, transaction } from '../db/database.js';
import { parseFinancialInput } from '../nlp/portugueseFinancialParser.js';
import { TransactionService } from './transactionService.js';
import { TransferService } from './transferService.js';
import { RecurringService } from './recurringService.js';
import { CategoryService } from './categoryService.js';
import { AccountService } from './accountService.js';
import { CreditCardService } from './creditCardService.js';
import { BudgetService } from './budgetService.js';

export class AssistantService {
  static getChatHistory(userId, limit = 50) {
    const messages = queryAll(
      `SELECT * FROM chat_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT ?`,
      [userId, limit]
    );
    return messages.map(m => ({
      ...m,
      metadata: m.metadata ? JSON.parse(m.metadata) : null
    }));
  }

  static getConversationContext(userId) {
    return queryOne('SELECT * FROM conversation_context WHERE user_id = ?', [userId]) || {};
  }

  static setConversationContext(userId, lastTxId, pendingAction, pendingPayload) {
    execute(
      `INSERT INTO conversation_context (user_id, last_transaction_id, pending_action, pending_payload, updated_at)
       VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
       ON CONFLICT(user_id) DO UPDATE SET 
         last_transaction_id = COALESCE(excluded.last_transaction_id, conversation_context.last_transaction_id),
         pending_action = excluded.pending_action,
         pending_payload = excluded.pending_payload,
         updated_at = excluded.updated_at`,
      [userId, lastTxId || null, pendingAction || null, pendingPayload ? JSON.stringify(pendingPayload) : null]
    );
  }

  static clearPendingContext(userId) {
    execute(
      `UPDATE conversation_context SET pending_action = NULL, pending_payload = NULL WHERE user_id = ?`,
      [userId]
    );
  }

  static async processMessage(userId, userMessage) {
    const rawText = userMessage.trim();
    if (!rawText) {
      throw new Error('Mensagem vazia');
    }

    // Save user message to chat history
    const userMsgId = crypto.randomUUID();
    execute(
      'INSERT INTO chat_messages (id, user_id, role, content) VALUES (?, ?, ?, ?)',
      [userMsgId, userId, 'user', rawText]
    );

    // Retrieve user state and financial resources
    const context = this.getConversationContext(userId);
    const categories = CategoryService.list(userId);
    const accounts = AccountService.list(userId);
    const creditCards = CreditCardService.list(userId);

    // Run Natural Language Parser
    const parsed = parseFinancialInput(rawText, context, categories, accounts, creditCards);

    let assistantResponse = '';
    let responseMetadata = { intent: parsed.intent };

    const fmtBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // -----------------------------------------------------------
    // EXECUTE PARSED INTENT
    // -----------------------------------------------------------
    switch (parsed.intent) {
      // 1. LANÇAR TRANSAÇÃO (RECEITA / DESPESA)
      case 'register_transaction': {
        const data = parsed.data;
        // Default account if not informed and no credit card
        let targetAccountId = data.accountId;
        let targetCardId = data.creditCardId;

        if (!targetAccountId && !targetCardId && accounts.length > 0) {
          targetAccountId = accounts[0].id;
        }

        const created = TransactionService.create(userId, {
          type: data.type,
          amount: data.amount,
          description: data.description,
          categoryId: data.categoryId,
          accountId: targetAccountId,
          creditCardId: targetCardId,
          paymentMethod: data.paymentMethod,
          date: data.date
        });

        this.clearPendingContext(userId);
        this.setConversationContext(userId, created.id, null, null);

        const icon = data.categoryIcon || (data.type === 'income' ? '💰' : '🏷️');
        const catLabel = data.categoryName || 'Geral';
        const cardNotice = created.credit_card_name ? ` no ${created.credit_card_name}` : '';

        assistantResponse = `Registrado ${icon}\n${fmtBRL(created.amount)} • ${catLabel}${cardNotice}`;
        responseMetadata = {
          intent: 'registered',
          transaction: created
        };
        break;
      }

      // 2. AMBIGUIDADE DETECTADA (Pedir esclarecimento ao invés de inventar)
      case 'ambiguous_expense': {
        this.setConversationContext(userId, null, 'clarify_category', parsed.data);
        assistantResponse = parsed.message;
        responseMetadata = {
          intent: 'clarification_needed',
          type: parsed.data.type,
          amount: parsed.data.amount
        };
        break;
      }

      // 3. TRANSFERÊNCIA ENTRE CONTAS (Não conta como gasto)
      case 'register_transfer': {
        const tData = parsed.data;
        const transfer = TransferService.create(userId, {
          sourceAccountId: tData.sourceAccountId,
          destinationAccountId: tData.destinationAccountId,
          amount: tData.amount,
          date: tData.date,
          description: tData.description
        });

        this.clearPendingContext(userId);
        assistantResponse = `Transferência realizada com sucesso! 🔁\n${fmtBRL(tData.amount)} transferidos de ${tData.sourceAccountName} para ${tData.destinationAccountName}.`;
        responseMetadata = {
          intent: 'transfer_created',
          transfer
        };
        break;
      }

      // 4. DESPESA RECORRENTE / ASSINATURA
      case 'register_recurring': {
        const rData = parsed.data;
        const recurring = RecurringService.create(userId, {
          description: rData.description,
          amount: rData.amount,
          type: rData.type,
          categoryId: rData.categoryId,
          dueDay: rData.dueDay,
          startDate: rData.startDate
        });

        this.clearPendingContext(userId);
        assistantResponse = `Despesa recorrente cadastrada! 📅\n${recurring.description} — ${fmtBRL(recurring.amount)} todo dia ${recurring.due_day}.`;
        responseMetadata = {
          intent: 'recurring_created',
          recurring
        };
        break;
      }

      // 5. CANCELAR RECORRÊNCIA
      case 'cancel_recurring': {
        try {
          const res = RecurringService.cancel(userId, parsed.keyword);
          assistantResponse = `Assinatura "${res.item.description}" cancelada com sucesso! 🛑`;
          responseMetadata = { intent: 'recurring_cancelled', item: res.item };
        } catch (err) {
          assistantResponse = err.message;
        }
        break;
      }

      // 6. COMANDOS DE ALTERAÇÃO (CORREÇÃO DE VALOR, CATEGORIA OU CONTA)
      case 'update_last_transaction':
      case 'update_transaction': {
        let targetTx = null;
        if (parsed.targetId) {
          targetTx = TransactionService.getById(userId, parsed.targetId);
        } else if (parsed.targetKeyword) {
          // Busca última transação com a keyword (ex: 'Uber', 'Mercado')
          const matches = queryAll(
            'SELECT * FROM transactions WHERE user_id = ? AND description LIKE ? ORDER BY created_at DESC LIMIT 1',
            [userId, `%${parsed.targetKeyword}%`]
          );
          if (matches.length > 0) targetTx = matches[0];
        }

        if (!targetTx) {
          targetTx = TransactionService.getLastTransaction(userId);
        }

        if (!targetTx) {
          assistantResponse = 'Não encontrei nenhum lançamento recente para alterar.';
          break;
        }

        const updates = {};
        if (parsed.updates.amount) {
          updates.amount = parsed.updates.amount;
        }
        if (parsed.updates.category) {
          updates.categoryId = parsed.updates.category.id;
        }
        if (parsed.updates.creditCardId) {
          updates.creditCardId = parsed.updates.creditCardId;
        }

        const updated = TransactionService.update(userId, targetTx.id, updates);
        this.clearPendingContext(userId);

        assistantResponse = `Lançamento atualizado! ✅\n${updated.description}: ${fmtBRL(updated.amount)} • ${updated.category_name || 'Geral'}`;
        responseMetadata = { intent: 'transaction_updated', transaction: updated };
        break;
      }

      // 7. PEDIDO DE EXCLUSÃO (COM CONFIRMAÇÃO OBRIGATÓRIA)
      case 'request_delete_last': {
        const lastTx = TransactionService.getLastTransaction(userId);
        if (!lastTx) {
          assistantResponse = 'Você não possui nenhum lançamento recente para excluir.';
          break;
        }

        this.setConversationContext(userId, lastTx.id, 'confirm_delete', { transactionId: lastTx.id, amount: lastTx.amount, description: lastTx.description });
        assistantResponse = `Tem certeza que deseja excluir esse lançamento de ${fmtBRL(lastTx.amount)} (${lastTx.description})? 🗑️`;
        responseMetadata = {
          intent: 'confirm_delete_prompt',
          transactionId: lastTx.id
        };
        break;
      }

      // 8. EXECUÇÃO DE EXCLUSÃO APÓS CONFIRMAÇÃO
      case 'execute_delete_transaction': {
        const res = TransactionService.delete(userId, parsed.targetId);
        this.clearPendingContext(userId);
        assistantResponse = `Lançamento excluído com sucesso! 🗑️\nO saldo das suas contas foi atualizado.`;
        responseMetadata = { intent: 'transaction_deleted', deleted: res.deleted };
        break;
      }

      // 9. CANCELAR AÇÃO
      case 'cancel_action': {
        this.clearPendingContext(userId);
        assistantResponse = parsed.message || 'Operação cancelada.';
        break;
      }

      // 10. CONSULTAS REAIS DO BANCO DE DADOS (Seção 4)
      case 'query_monthly_expenses': {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const mKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const row = queryOne(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND strftime('%Y-%m', transaction_date) = ?`,
          [userId, mKey]
        );
        assistantResponse = `Você gastou ${fmtBRL(row.total)} este mês.`;
        responseMetadata = { intent: 'query_result', value: row.total };
        break;
      }

      case 'query_category_expenses': {
        const cat = parsed.category;
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const mKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const row = queryOne(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND category_id = ? AND type = 'expense' AND strftime('%Y-%m', transaction_date) = ?`,
          [userId, cat.id, mKey]
        );
        assistantResponse = `Você gastou ${fmtBRL(row.total)} com ${cat.name} ${cat.icon} este mês.`;
        responseMetadata = { intent: 'query_result', category: cat.name, value: row.total };
        break;
      }

      case 'query_highest_expense': {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const mKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const row = queryOne(
          `SELECT t.*, c.name as category_name, c.icon as category_icon
           FROM transactions t
           LEFT JOIN categories c ON t.category_id = c.id
           WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
           ORDER BY t.amount DESC LIMIT 1`,
          [userId, mKey]
        );
        if (row) {
          assistantResponse = `Seu maior gasto este mês foi ${row.description} (${row.category_name || 'Geral'} ${row.category_icon || '📦'}) no valor de ${fmtBRL(row.amount)}.`;
        } else {
          assistantResponse = 'Você ainda não registrou despesas este mês.';
        }
        break;
      }

      case 'query_monthly_income': {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const mKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
        const row = queryOne(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'income' AND strftime('%Y-%m', transaction_date) = ?`,
          [userId, mKey]
        );
        assistantResponse = `Você recebeu um total de ${fmtBRL(row.total)} em receitas este mês. 💰`;
        break;
      }

      case 'query_balance': {
        const row = queryOne('SELECT COALESCE(SUM(current_balance), 0) as total FROM accounts WHERE user_id = ? AND active = 1', [userId]);
        assistantResponse = `Seu saldo total disponível é de ${fmtBRL(row.total)}. 💳`;
        break;
      }

      case 'query_budget_remaining': {
        const now = new Date();
        const budgets = BudgetService.getMonthlyBudgets(userId, now.getMonth() + 1, now.getFullYear());
        const totalBudget = budgets.reduce((acc, b) => acc + b.budget_amount, 0);
        const totalSpent = budgets.reduce((acc, b) => acc + b.spent_amount, 0);
        const remaining = totalBudget - totalSpent;
        if (totalBudget > 0) {
          assistantResponse = `Você definiu um orçamento de ${fmtBRL(totalBudget)}. Já utilizou ${fmtBRL(totalSpent)} e ainda pode gastar ${fmtBRL(Math.max(0, remaining))}.`;
        } else {
          assistantResponse = 'Você ainda não definiu um teto de orçamento para suas categorias.';
        }
        break;
      }

      case 'query_last_week_expenses': {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const d7 = new Date(now);
        d7.setDate(now.getDate() - 7);
        const startStr = `${d7.getFullYear()}-${pad(d7.getMonth() + 1)}-${pad(d7.getDate())}`;
        const endStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

        const row = queryOne(
          `SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE user_id = ? AND type = 'expense' AND transaction_date >= ? AND transaction_date <= ?`,
          [userId, startStr, endStr]
        );
        assistantResponse = `Nos últimos 7 dias, seus gastos somaram ${fmtBRL(row.total)}.`;
        break;
      }

      case 'query_card_expenses': {
        const cards = CreditCardService.list(userId);
        const totalUsed = cards.reduce((acc, c) => acc + (c.limit_used || 0), 0);
        const cardNames = cards.map(c => `${c.name}: ${fmtBRL(c.limit_used)}`).join(', ');
        assistantResponse = `O total da fatura dos seus cartões é ${fmtBRL(totalUsed)} (${cardNames || 'nenhum gasto'}). 💳`;
        break;
      }

      case 'query_upcoming_bills': {
        const bills = RecurringService.list(userId);
        if (bills.length === 0) {
          assistantResponse = 'Você não possui contas recorrentes cadastradas para pagar.';
        } else {
          const listStr = bills.map(b => `• ${b.description}: ${fmtBRL(b.amount)} (dia ${b.due_day})`).join('\n');
          assistantResponse = `Suas próximas contas a pagar são:\n${listStr}`;
        }
        break;
      }

      case 'ambiguous_transfer': {
        assistantResponse = parsed.message;
        break;
      }

      default: {
        assistantResponse = parsed.message || 'Desculpe, não compreendi. Você pode falar "Gastei 25 no Uber" ou perguntar "Quanto gastei esse mês?".';
        break;
      }
    }

    // Save assistant message to chat history
    const assistantMsgId = crypto.randomUUID();
    execute(
      'INSERT INTO chat_messages (id, user_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)',
      [assistantMsgId, userId, 'assistant', assistantResponse, JSON.stringify(responseMetadata)]
    );

    return {
      message: assistantResponse,
      metadata: responseMetadata
    };
  }
}
