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
router.post('/auth/register', (req, res) => {
  try {
    const { name, email, password } = req.body;
    const result = AuthService.register(name, email, password);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const result = AuthService.login(email, password);
    res.json(result);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
});

router.get('/auth/me', authMiddleware, (req, res) => {
  try {
    const profile = AuthService.getProfile(req.user.id);
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
router.get('/assistant/history', (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const history = AssistantService.getChatHistory(req.user.id, limit);
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
router.get('/transactions', (req, res) => {
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
    const list = TransactionService.list(req.user.id, filters);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/transactions/:id', (req, res) => {
  try {
    const tx = TransactionService.getById(req.user.id, req.params.id);
    if (!tx) return res.status(404).json({ error: 'Transação não encontrada' });
    res.json(tx);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transactions', (req, res) => {
  try {
    const tx = TransactionService.create(req.user.id, req.body);
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/transactions/:id', (req, res) => {
  try {
    const tx = TransactionService.update(req.user.id, req.params.id, req.body);
    res.json(tx);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/transactions/:id', (req, res) => {
  try {
    const result = TransactionService.delete(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/transactions/:id/duplicate', (req, res) => {
  try {
    const duplicated = TransactionService.duplicate(req.user.id, req.params.id);
    res.status(201).json(duplicated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// TRANSFERS
// -------------------------------------------------------------
router.get('/transfers', (req, res) => {
  try {
    const list = TransferService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/transfers', (req, res) => {
  try {
    const transfer = TransferService.create(req.user.id, req.body);
    res.status(201).json(transfer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/transfers/:id', (req, res) => {
  try {
    const result = TransferService.delete(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// ACCOUNTS
// -------------------------------------------------------------
router.get('/accounts', (req, res) => {
  try {
    const list = AccountService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/accounts', (req, res) => {
  try {
    const acc = AccountService.create(req.user.id, req.body);
    res.status(201).json(acc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/accounts/:id', (req, res) => {
  try {
    const acc = AccountService.update(req.user.id, req.params.id, req.body);
    res.json(acc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/accounts/:id', (req, res) => {
  try {
    AccountService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CREDIT CARDS
// -------------------------------------------------------------
router.get('/credit-cards', (req, res) => {
  try {
    const list = CreditCardService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/credit-cards', (req, res) => {
  try {
    const card = CreditCardService.create(req.user.id, req.body);
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/credit-cards/:id', (req, res) => {
  try {
    const card = CreditCardService.update(req.user.id, req.params.id, req.body);
    res.json(card);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/credit-cards/:id', (req, res) => {
  try {
    CreditCardService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// CATEGORIES
// -------------------------------------------------------------
router.get('/categories', (req, res) => {
  try {
    const list = CategoryService.list(req.user.id, req.query.type);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/categories', (req, res) => {
  try {
    const cat = CategoryService.create(req.user.id, req.body);
    res.status(201).json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/categories/:id', (req, res) => {
  try {
    const cat = CategoryService.update(req.user.id, req.params.id, req.body);
    res.json(cat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/categories/:id', (req, res) => {
  try {
    CategoryService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BUDGETS
// -------------------------------------------------------------
router.get('/budgets', (req, res) => {
  try {
    const list = BudgetService.getMonthlyBudgets(req.user.id, req.query.month, req.query.year);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/budgets', (req, res) => {
  try {
    const result = BudgetService.setBudget(req.user.id, req.body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/budgets/:id', (req, res) => {
  try {
    BudgetService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// RECURRING TRANSACTIONS
// -------------------------------------------------------------
router.get('/recurring', (req, res) => {
  try {
    const list = RecurringService.list(req.user.id);
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/recurring', (req, res) => {
  try {
    const rec = RecurringService.create(req.user.id, req.body);
    res.status(201).json(rec);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/recurring/cancel', (req, res) => {
  try {
    const { keyword } = req.body;
    const result = RecurringService.cancel(req.user.id, keyword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/recurring/:id', (req, res) => {
  try {
    RecurringService.delete(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REPORTS & DASHBOARD & EXPORT
// -------------------------------------------------------------
router.get('/reports/dashboard', (req, res) => {
  try {
    const summary = ReportService.getDashboardSummary(req.user.id, req.query.month, req.query.year);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/monthly', (req, res) => {
  try {
    const data = ReportService.getReportsData(req.user.id, req.query.month, req.query.year);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/export/csv', (req, res) => {
  try {
    const csvData = ReportService.exportCSV(req.user.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="financas.csv"');
    res.send(csvData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/export/excel', (req, res) => {
  try {
    const buffer = ReportService.exportExcel(req.user.id);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="financas.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
