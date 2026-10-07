import { queryAll, queryOne } from '../db/database.js';
import * as XLSX from 'xlsx';

export class ReportService {
  static async getDashboardSummary(userId, month, year) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const monthKey = `${targetYear}-${pad(targetMonth)}`;
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    // 1. Total Balance across active accounts
    const balanceRow = await queryOne(
      'SELECT COALESCE(SUM(current_balance), 0) as total_balance FROM accounts WHERE user_id = ? AND active = 1',
      [userId]
    );
    const totalBalance = balanceRow ? parseFloat(balanceRow.total_balance) : 0;

    // 2. Month Incomes
    const incomeRow = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total_income
       FROM transactions
       WHERE user_id = ? AND type = 'income' AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, monthKey]
    );
    const monthIncome = incomeRow ? parseFloat(incomeRow.total_income) : 0;

    // 3. Month Expenses
    const expenseRow = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as total_expense
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, monthKey]
    );
    const monthExpense = expenseRow ? parseFloat(expenseRow.total_expense) : 0;

    // 4. Month Result
    const monthResult = monthIncome - monthExpense;

    // 5. Today Expenses
    const todayRow = await queryOne(
      `SELECT COALESCE(SUM(amount), 0) as today_expense
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND transaction_date = ?`,
      [userId, todayStr]
    );
    const todayExpense = todayRow ? parseFloat(todayRow.today_expense) : 0;

    // 6. Expenses by Category
    const categoryExpenses = await queryAll(
      `SELECT c.id, c.name, c.icon, c.color,
              COALESCE(SUM(t.amount), 0) as total,
              COUNT(t.id) as count
       FROM categories c
       JOIN transactions t ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total DESC`,
      [userId, monthKey]
    );

    const categoriesWithPercent = categoryExpenses.map(cat => {
      const tot = parseFloat(cat.total) || 0;
      return {
        ...cat,
        total: tot,
        count: parseInt(cat.count, 10) || 0,
        percentage: monthExpense > 0 ? Math.round((tot / monthExpense) * 1000) / 10 : 0
      };
    });

    // 7. Recent Transactions (last 10)
    const recentTransactionsRaw = await queryAll(
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
    const recentTransactions = recentTransactionsRaw.map(t => ({
      ...t,
      amount: parseFloat(t.amount) || 0
    }));

    // 8. Upcoming Recurring Bills
    const upcomingBillsRaw = await queryAll(
      `SELECT r.*, c.name as category_name, c.icon as category_icon
       FROM recurring_transactions r
       LEFT JOIN categories c ON r.category_id = c.id
       WHERE r.user_id = ? AND r.active = 1
       ORDER BY r.due_day ASC`,
      [userId]
    );
    const upcomingBills = upcomingBillsRaw.map(r => ({
      ...r,
      amount: parseFloat(r.amount) || 0
    }));

    // 9. Credit Cards Summary
    const cards = await queryAll(
      `SELECT * FROM credit_cards WHERE user_id = ? AND active = 1`,
      [userId]
    );
    const creditCards = [];
    for (const card of cards) {
      const usedRow = await queryOne(
        `SELECT COALESCE(SUM(amount), 0) as used
         FROM transactions
         WHERE user_id = ? AND credit_card_id = ? AND type = 'expense'
           AND strftime('%Y-%m', transaction_date) = ?`,
        [userId, card.id, monthKey]
      );
      const used = usedRow ? parseFloat(usedRow.used) : 0;
      const limit = parseFloat(card.credit_limit) || 0;
      creditCards.push({
        ...card,
        credit_limit: limit,
        limit_used: used,
        limit_available: Math.max(0, limit - used),
        current_invoice: used
      });
    }

    // 10. Accounts with individual balances and month summary
    const accountsRaw = await queryAll(
      `SELECT * FROM accounts WHERE user_id = ? AND active = 1 ORDER BY created_at ASC`,
      [userId]
    );
    const accounts = [];
    for (const acc of accountsRaw) {
      const accIncomeRow = await queryOne(
        `SELECT COALESCE(SUM(amount), 0) as income
         FROM transactions
         WHERE user_id = ? AND account_id = ? AND type = 'income'
           AND strftime('%Y-%m', transaction_date) = ?`,
        [userId, acc.id, monthKey]
      );
      const accExpenseRow = await queryOne(
        `SELECT COALESCE(SUM(amount), 0) as expense
         FROM transactions
         WHERE user_id = ? AND account_id = ? AND type = 'expense'
           AND strftime('%Y-%m', transaction_date) = ?`,
        [userId, acc.id, monthKey]
      );
      const accIncome = accIncomeRow ? parseFloat(accIncomeRow.income) : 0;
      const accExpense = accExpenseRow ? parseFloat(accExpenseRow.expense) : 0;

      accounts.push({
        ...acc,
        current_balance: parseFloat(acc.current_balance) || 0,
        initial_balance: parseFloat(acc.initial_balance) || 0,
        monthIncome: accIncome,
        monthExpense: accExpense,
        monthResult: accIncome - accExpense
      });
    }

    return {
      period: { month: targetMonth, year: targetYear, monthKey },
      balance: {
        total: totalBalance,
        monthIncome,
        monthExpense,
        monthResult,
        todayExpense
      },
      accounts,
      categories: categoriesWithPercent,
      recentTransactions,
      upcomingBills,
      creditCards
    };
  }

  static async getReportsData(userId, month, year) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const targetMonth = parseInt(month, 10) || (now.getMonth() + 1);
    const targetYear = parseInt(year, 10) || now.getFullYear();
    const currentMonthKey = `${targetYear}-${pad(targetMonth)}`;

    const prevDate = new Date(targetYear, targetMonth - 2, 1);
    const prevMonthKey = `${prevDate.getFullYear()}-${pad(prevDate.getMonth() + 1)}`;
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    // Current Month Totals
    const currentTotalsRow = await queryOne(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE user_id = ? AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, currentMonthKey]
    );
    const currentTotals = {
      income: currentTotalsRow ? parseFloat(currentTotalsRow.income) : 0,
      expense: currentTotalsRow ? parseFloat(currentTotalsRow.expense) : 0
    };

    // Previous Month Totals
    const prevTotalsRow = await queryOne(
      `SELECT 
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
       FROM transactions
       WHERE user_id = ? AND strftime('%Y-%m', transaction_date) = ?`,
      [userId, prevMonthKey]
    );
    const prevTotals = {
      income: prevTotalsRow ? parseFloat(prevTotalsRow.income) : 0,
      expense: prevTotalsRow ? parseFloat(prevTotalsRow.expense) : 0
    };

    // Expenses by Category
    const categoryExpensesRaw = await queryAll(
      `SELECT c.id, c.name, c.icon, c.color,
              COALESCE(SUM(t.amount), 0) as total,
              COUNT(t.id) as count
       FROM categories c
       JOIN transactions t ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY c.id, c.name, c.icon, c.color
       ORDER BY total DESC`,
      [userId, currentMonthKey]
    );
    const categoryExpenses = categoryExpensesRaw.map(c => ({
      ...c,
      total: parseFloat(c.total) || 0,
      count: parseInt(c.count, 10) || 0
    }));

    // 6-month historical timeline
    const timeline = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(targetYear, targetMonth - 1 - i, 1);
      const mKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      const mRow = await queryOne(
        `SELECT 
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expense
         FROM transactions
         WHERE user_id = ? AND strftime('%Y-%m', transaction_date) = ?`,
        [userId, mKey]
      );
      const inc = mRow ? parseFloat(mRow.income) : 0;
      const exp = mRow ? parseFloat(mRow.expense) : 0;

      timeline.push({
        monthKey: mKey,
        monthName: monthNames[d.getMonth()].slice(0, 3),
        year: d.getFullYear(),
        income: inc,
        expense: exp,
        result: inc - exp
      });
    }

    // Top 5 expenses of current month
    const topExpensesRaw = await queryAll(
      `SELECT t.*, c.name as category_name, c.icon as category_icon
       FROM transactions t
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       ORDER BY t.amount DESC
       LIMIT 5`,
      [userId, currentMonthKey]
    );
    const topExpenses = topExpensesRaw.map(t => ({
      ...t,
      amount: parseFloat(t.amount) || 0
    }));

    // Expenses by Account
    const expensesByAccountRaw = await queryAll(
      `SELECT a.name, a.institution, COALESCE(SUM(t.amount), 0) as total
       FROM accounts a
       JOIN transactions t ON t.account_id = a.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY a.id, a.name, a.institution
       ORDER BY total DESC`,
      [userId, currentMonthKey]
    );
    const expensesByAccount = expensesByAccountRaw.map(a => ({
      ...a,
      total: parseFloat(a.total) || 0
    }));

    // Expenses by Credit Card
    const expensesByCardRaw = await queryAll(
      `SELECT cc.name, cc.institution, COALESCE(SUM(t.amount), 0) as total
       FROM credit_cards cc
       JOIN transactions t ON t.credit_card_id = cc.id
       WHERE t.user_id = ? AND t.type = 'expense' AND strftime('%Y-%m', t.transaction_date) = ?
       GROUP BY cc.id, cc.name, cc.institution
       ORDER BY total DESC`,
      [userId, currentMonthKey]
    );
    const expensesByCard = expensesByCardRaw.map(c => ({
      ...c,
      total: parseFloat(c.total) || 0
    }));

    // Smart Telemetry-driven Financial Insights
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

  static async exportCSV(userId) {
    const transactions = await queryAll(
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

    return '\uFEFF' + [headers, ...rows].join('\n');
  }

  static async exportExcel(userId) {
    const transactions = await queryAll(
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

    const categories = await queryAll(
      `SELECT c.name as "Categoria",
              c.type as "Tipo",
              COALESCE(SUM(t.amount), 0) as "Total Acumulado (R$)",
              COUNT(t.id) as "Qtd Transações"
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id AND t.user_id = ?
       WHERE c.user_id = ?
       GROUP BY c.id, c.name, c.type
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
