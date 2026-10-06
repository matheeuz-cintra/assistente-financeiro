import { queryAll, queryOne } from '../db/database.js';
import * as XLSX from 'xlsx';

export class ReportService {
  static getDashboardSummary(userId, month, year) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const monthKey = `${targetYear}-${pad(targetMonth)}`;
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1. Total Balance across active accounts
    const balanceRow = queryOne(
      'SELECT COALESCE(SUM(current_balance), 0) as total_balance FROM accounts WHERE user_id = ? AND active = 1',
      [userId]
    );
    const totalBalance = balanceRow ? balanceRow.total_balance : 0;

    // 2. Month Incomes
    const incomeRow = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total_income
       FROM transactions
       WHERE user_id = ? AND type = 'income' AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, monthKey]
    );
    const monthIncome = incomeRow ? incomeRow.total_income : 0;

    // 3. Month Expenses
    const expenseRow = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total_expense
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, monthKey]
    );
    const monthExpense = expenseRow ? expenseRow.total_expense : 0;

    // 4. Month Result
    const monthResult = monthIncome - monthExpense;

    // 5. Today Expenses
    const todayRow = queryOne(
      `SELECT COALESCE(SUM(amount), 0) as today_expense
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND transaction_date = ?`,
      [userId, todayStr]
    );
    const todayExpense = todayRow ? todayRow.today_expense : 0;

    // 6. Expenses by Category
    const categoryExpenses = queryAll(
      `SELECT c.id, c.name, c.icon, c.color,
              COALESCE(SUM(t.amount), 0) as total,
              COUNT(t.id) as count
       FROM categories c
       JOIN transactions t ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY c.id
       ORDER BY total DESC`,
      [userId, monthKey]
    );

    const categoriesWithPercent = categoryExpenses.map(cat => ({
      ...cat,
      percentage: monthExpense > 0 ? Math.round((cat.total / monthExpense) * 1000) / 10 : 0
    }));

    // 7. Recent Transactions (last 10)
    const recentTransactions = queryAll(
      `SELECT t.*,
              c.name as category_name, c.icon as category_icon, c.color as category_color,
              a.name as account_name,
              cc.name as credit_card_name
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC, t.transaction_time DESC, t.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // 8. Upcoming Recurring Bills
    const upcomingBills = queryAll(
      `SELECT r.*, c.name as category_name, c.icon as category_icon
       FROM recurring_transactions r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ? AND r.active = 1
       ORDER BY r.due_day ASC`,
      [userId]
    );

    // 9. Credit Cards Summary
    const creditCards = queryAll(
      `SELECT * FROM credit_cards WHERE user_id = ? AND active = 1`,
      [userId]
    ).map(card => {
      const usedRow = queryOne(
        `SELECT COALESCE(SUM(amount), 0) as used
         FROM transactions
         WHERE user_id = ? AND credit_card_id = ? AND type = 'expense'
           AND strftime('%Y-%m', transaction_date) = ?`,
        [userId, card.id, monthKey]
      );
      const used = usedRow ? usedRow.used : 0;
      return {
        ...card,
        limit_used: used,
        limit_available: Math.max(0, (card.credit_limit || 0) - used),
        current_invoice: used
      };
    });

    return {
      period: { month: targetMonth, year: targetYear, monthKey },
      balance: {
        total: totalBalance,
        monthIncome,
        monthExpense,
        monthResult,
        todayExpense
      },
      categories: categoriesWithPercent,
      recentTransactions,
      upcomingBills,
      creditCards
    };
  }

  static getReportsData(userId, month, year) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const currentMonthKey = `${targetYear}-${pad(targetMonth)}`;

    // Previous month calculation
    const prevDate = new Date(targetYear, targetMonth - 2, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Current Month Totals
    const currentTotals = queryOne(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE user_id = ? AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, currentMonthKey]
    ) || { income: 0, expense: 0 };

    // Previous Month Totals
    const prevTotals = queryOne(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE user_id = ? AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, prevMonthKey]
    ) || { income: 0, expense: 0 };

    // Expenses by Category
    const categoryExpenses = queryAll(
      `SELECT c.id, c.name, c.icon, c.color,
              COALESCE(SUM(t.amount), 0) as total,
              COUNT(t.id) as count
       FROM categories c
       JOIN transactions t ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY c.id
       ORDER BY total DESC`,
      [userId, currentMonthKey]
    );

    // 6-month historical timeline
    const timeline = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - 1 - i, 1);
      const mKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const mRow = queryOne(
        `SELECT 
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE user_id = ? AND strftime('%Y-%m', transaction_date) = ?`,
        [userId, mKey]
      ) || { income: 0, expense: 0 };

      timeline.push({
        monthKey: mKey,
        monthName: monthNames[d.getMonth()].slice(0, 3),
        year: d.getFullYear(),
        income: mRow.income,
        expense: mRow.expense,
        result: mRow.income - mRow.expense
      });
    }

    // Top 5 expenses of current month
    const topExpenses = queryAll(
      `SELECT t.*, c.name as category_name, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       ORDER BY t.amount DESC
       LIMIT 5`,
      [userId, currentMonthKey]
    );

    // Expenses by Account
    const expensesByAccount = queryAll(
      `SELECT a.name, a.institution, COALESCE(SUM(t.amount), 0) as total
       FROM accounts a
       JOIN transactions t ON t.account_id = a.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY a.id
       ORDER BY total DESC`,
      [userId, currentMonthKey]
    );

    // Expenses by Credit Card
    const expensesByCard = queryAll(
      `SELECT cc.name, cc.institution, COALESCE(SUM(t.amount), 0) as total
       FROM credit_cards cc
       JOIN transactions t ON t.credit_card_id = cc.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY cc.id
       ORDER BY total DESC`,
      [userId, currentMonthKey]
    );

    // Smart Telemetry-driven Financial Insights (Section 19)
    const insights = [];
    if (categoryExpenses.length > 0) {
      const topCat = categoryExpenses[0];
      insights.push({
        type: 'highlight',
        title: 'Maior Centro de Custo',
        text: `Seu maior gasto neste mês foi em ${topCat.name} (${topCat.icon}), totalizando R$ ${topCat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
      });
    }

    if (prevTotals.expense > 0 && currentTotals.expense > 0) {
      const diffPercent = Math.round(((currentTotals.expense - prevTotals.expense) / prevTotals.expense) * 100);
      if (diffPercent > 0) {
        insights.push({
          type: 'warning',
          title: 'Aumento nos Gastos',
          text: `Seus gastos aumentaram ${diffPercent}% em relação ao mês anterior (R$ ${currentTotals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vs R$ ${prevTotals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`
        });
      } else if (diffPercent < 0) {
        insights.push({
          type: 'success',
          title: 'Economia Conquistada',
          text: `Parabéns! Seus gastos diminuíram ${Math.abs(diffPercent)}% em relação ao mês passado.`
        });
      }
    }

    if (currentTotals.income > currentTotals.expense && currentTotals.expense > 0) {
      const saveRate = Math.round(((currentTotals.income - currentTotals.expense) / currentTotals.income) * 100);
      insights.push({
        type: 'success',
        title: 'Taxa de Poupança',
        text: `Você está poupando ${saveRate}% de tudo o que recebeu neste mês!`
      });
    }

    return {
      currentMonth: {
        month: targetMonth,
        monthName: monthNames[targetMonth - 1],
        year: targetYear,
        income: currentTotals.income,
        expense: currentTotals.expense,
        result: currentTotals.income - currentTotals.expense
      },
      previousMonth: {
        monthKey: prevMonthKey,
        income: prevTotals.income,
        expense: prevTotals.expense,
        result: prevTotals.income - prevTotals.expense
      },
      categoryExpenses,
      timeline,
      topExpenses,
      expensesByAccount,
      expensesByCard,
      insights
    };
  }

  static exportCSV(userId) {
    const transactions = queryAll(
      `SELECT t.transaction_date as "Data",
              t.type as "Tipo",
              t.amount as "Valor",
              t.description as "Descricao",
              c.name as "Categoria",
              COALESCE(a.name, cc.name, 'Nao informado') as "Conta_ou_Cartao",
              t.payment_method as "Forma_Pagamento",
              COALESCE(t.notes, '') as "Observacoes"
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC`,
      [userId]
    );

    if (transactions.length === 0) {
      return '\uFEFFData,Tipo,Valor,Descricao,Categoria,Conta_ou_Cartao,Forma_Pagamento,Observacoes\n';
    }

    const headers = Object.keys(transactions[0]).join(';');
    const rows = transactions.map(row =>
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(';')
    );

    // Include UTF-8 BOM so Excel opens with proper accents
    return '\uFEFF' + [headers, ...rows].join('\n');
  }

  static exportExcel(userId) {
    const transactions = queryAll(
      `SELECT t.transaction_date as "Data",
              CASE WHEN t.type = 'income' THEN 'Receita' ELSE 'Despesa' END as "Tipo",
              t.amount as "Valor (R$)",
              t.description as "Descrição",
              COALESCE(c.name, 'Outros') as "Categoria",
              COALESCE(a.name, cc.name, 'Não informado') as "Conta / Cartão",
              t.payment_method as "Forma de Pagamento",
              COALESCE(t.notes, '') as "Observações"
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       LEFT JOIN accounts a ON t.account_id = a.id
       LEFT JOIN credit_cards cc ON t.credit_card_id = cc.id
       WHERE t.user_id = ?
       ORDER BY t.transaction_date DESC`,
      [userId]
    );

    const categories = queryAll(
      `SELECT c.name as "Categoria",
              c.type as "Tipo",
              COALESCE(SUM(t.amount), 0) as "Total Acumulado (R$)",
              COUNT(t.id) as "Qtd Transações"
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = ?
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY "Total Acumulado (R$)" DESC`,
      [userId, userId]
    );

    const wb = XLSX.utils.book_new();

    const wsTransactions = XLSX.utils.json_to_sheet(transactions);
    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Lançamentos');

    const wsCategories = XLSX.utils.json_to_sheet(categories);
    XLSX.utils.book_append_sheet(wb, wsCategories, 'Resumo Categorias');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}
