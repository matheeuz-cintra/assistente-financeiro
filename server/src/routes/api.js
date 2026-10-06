import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { AuthService } from '../services/authService.js';
import { TransactionService } from '../services/transactionService.js';
import { TransferService } from '../services/transferService.js';
import { AccountService } from '../services/accountService.js';
import { CreditCardService } from '../services/creditCardService.js';
import { CategoryService } from '../services/categoryService.js';
import { BudgetService } from '../services/budgetService.js';
import { RecurringService } from '../services/recurringService.js';
import { ReportService } from '../services/reportService.js';
import { AssistantService } from '../services/assistantService.js';

export const router = express.Router();

// -------------------------------------------------------------
// AUTH ROUTES
// -------------------------------------------------------------
router.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = await AuthService.register(name, email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/auth/me', authMiddleware, async (req, res) => {
  try {
    const profile = await AuthService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// All following routes require authentication
router.use(authMiddleware);

// -------------------------------------------------------------
// ASSISTANT (CHAT & NATURAL LANGUAGE & VOICE)
// -------------------------------------------------------------
router.get('/assistant/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = await AssistantService.getChatHistory(req.user.id, limit);
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/assistant/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Mensagem é obrigatória' });
    const result = await AssistantService.processMessage(req.user.id, message);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// TRANSACTIONS
// -------------------------------------------------------------
router.get('/transactions', async (req, res) => {
  try {
    const filters = {
      type: req.query.type,
      categoryId: req.query.categoryId,
      accountId: req.query.accountId,
      creditCardId: req.query.creditCardId,
      period: req.query.period,
      month: req.query.month,
      year: req.query.year,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      search: req.query.search,
      limit: req.query.limit
    };
    const list = await TransactionService.list(req.user.id, filters);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions/:id', async (req, res) => {
  try {
    const tx = await TransactionService.getById(req.user.id, req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const tx = await TransactionService.create(req.user.id, req.body);
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/transactions/:id', async (req, res) => {
  try {
    const tx = await TransactionService.update(req.user.id, req.params.id, req.body);
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    const result = await TransactionService.delete(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/transactions/:id/duplicate', async (req, res) => {
  try {
    const duplicated = await TransactionService.duplicate(req.user.id, req.params.id);
    res.status(201).json(duplicated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// TRANSFERS
// -------------------------------------------------------------
router.get('/transfers', async (req, res) => {
  try {
    const list = await TransferService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transfers', async (req, res) => {
  try {
    const transfer = await TransferService.create(req.user.id, req.body);
    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/transfers/:id', async (req, res) => {
  try {
    const result = await TransferService.delete(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ACCOUNTS
// -------------------------------------------------------------
router.get('/accounts', async (req, res) => {
  try {
    const list = await AccountService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts', async (req, res) => {
  try {
    const acc = await AccountService.create(req.user.id, req.body);
    res.status(201).json(acc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    const acc = await AccountService.update(req.user.id, req.params.id, req.body);
    res.json(acc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    await AccountService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CREDIT CARDS
// -------------------------------------------------------------
router.get('/credit-cards', async (req, res) => {
  try {
    const list = await CreditCardService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/credit-cards', async (req, res) => {
  try {
    const card = await CreditCardService.create(req.user.id, req.body);
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/credit-cards/:id', async (req, res) => {
  try {
    const card = await CreditCardService.update(req.user.id, req.params.id, req.body);
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/credit-cards/:id', async (req, res) => {
  try {
    await CreditCardService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------
router.get('/categories', async (req, res) => {
  try {
    const list = await CategoryService.list(req.user.id, req.query.type);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', async (req, res) => {
  try {
    const cat = await CategoryService.create(req.user.id, req.body);
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/categories/:id', async (req, res) => {
  try {
    const cat = await CategoryService.update(req.user.id, req.params.id, req.body);
    res.json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/categories/:id', async (req, res) => {
  try {
    await CategoryService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BUDGETS
// -------------------------------------------------------------
router.get('/budgets', async (req, res) => {
  try {
    const list = await BudgetService.getMonthlyBudgets(req.user.id, req.query.month, req.query.year);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/budgets', async (req, res) => {
  try {
    const result = await BudgetService.setBudget(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/budgets/:id', async (req, res) => {
  try {
    await BudgetService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// RECURRING TRANSACTIONS
// -------------------------------------------------------------
router.get('/recurring', async (req, res) => {
  try {
    const list = await RecurringService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recurring', async (req, res) => {
  try {
    const rec = await RecurringService.create(req.user.id, req.body);
    res.status(201).json(rec);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/recurring/cancel', async (req, res) => {
  try {
    const { keyword } = req.body;
    const result = await RecurringService.cancel(req.user.id, keyword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/recurring/:id', async (req, res) => {
  try {
    await RecurringService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REPORTS & DASHBOARD & EXPORT
// -------------------------------------------------------------
router.get('/reports/dashboard', async (req, res) => {
  try {
    const summary = await ReportService.getDashboardSummary(req.user.id, req.query.month, req.query.year);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/monthly', async (req, res) => {
  try {
    const data = await ReportService.getReportsData(req.user.id, req.query.month, req.query.year);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/export/csv', async (req, res) => {
  try {
    const csvData = await ReportService.exportCSV(req.user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="financas.csv"');
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/export/excel', async (req, res) => {
  try {
    const buffer = await ReportService.exportExcel(req.user.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="financas.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
