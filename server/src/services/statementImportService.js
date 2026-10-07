import crypto from 'node:crypto';
import * as xlsx from 'xlsx';
import { queryAll, queryOne, execute, transaction } from '../db/database.js';

// Brazilian keyword dictionary for smart categorization
const CATEGORY_KEYWORDS = {
  'Alimentação': [
    'ifood', 'restaurante', 'lanchonete', 'burger', 'mcdonalds', 'mc donalds', 'bk', 'burger king',
    'subway', 'bar', 'choperia', 'pizzaria', 'pizza', 'sushi', 'padaria', 'panificadora',
    'cafeteria', 'starbucks', 'acai', 'açaí', 'doceria', 'sorvete', 'restaur', 'churrascaria',
    'pastel', 'pastelaria', 'espetinho', 'habibs', 'bobs', 'fogao', 'fogão', 'cantina'
  ],
  'Mercado': [
    'supermercado', 'mercado', 'atacadao', 'atacadão', 'assai', 'assaí', 'carrefour',
    'pao de acucar', 'pão de açúcar', 'extra', 'dia brasil', 'hortifruti', 'mercearia',
    'sacolao', 'sacolão', 'hipermercado', 'emporio', 'empório', 'quitanda', 'acougue', 'açougue',
    'varejao', 'varejão', 'superpao', 'superm'
  ],
  'Transporte': [
    'uber', '99app', '99 tecnologia', '99 pop', 'taxi', 'táxi', 'estacionamento',
    'pedagio', 'pedágio', 'sem parar', 'conectcar', 'veloe', 'bilhete unico',
    'metro', 'metrô', 'cptm', 'onibus', 'ônibus', 'passagem', 'auto pista', 'rodoviaria',
    'estapar', 'mobilidade', 'voegol', 'latam', 'azul'
  ],
  'Combustível': [
    'posto', 'gasolina', 'combustivel', 'combustível', 'etanol', 'shell', 'ipiranga',
    'br distribuidora', 'petrobras', 'ale combustiveis', 'auto posto', 'lubrificante'
  ],
  'Moradia': [
    'aluguel', 'condominio', 'condomínio', 'imobiliaria', 'quintoandar', 'loft',
    'iptu', 'reforma', 'construcao', 'materiais', 'leroy merlin', 'telhanorte', 'c&c'
  ],
  'Energia': ['enel', 'cpfl', 'eletropaulo', 'cemig', 'copel', 'energisa', 'luz', 'energia', 'celpe', 'coelba'],
  'Água': ['sabesp', 'copasa', 'sanepar', 'cedae', 'embasa', 'corsan', 'agua', 'água', 'saneamento', 'caesb'],
  'Internet': ['internet', 'banda larga', 'fibra', 'claro net', 'vivo fibra', 'oi fibra', 'tim live'],
  'Telefone': ['recarga', 'tim celular', 'vivo celular', 'claro celular', 'oi celular', 'recargapay'],
  'Saúde': [
    'farmacia', 'farmácia', 'drogaria', 'droga raia', 'drogasil', 'pague menos',
    'panvel', 'ultrafarma', 'hospital', 'clinica', 'clínica', 'laboratorio', 'laboratório',
    'fleury', 'lavoisier', 'medico', 'médico', 'consulta', 'dentista', 'odonto', 'psicolog',
    'oftalmo', 'otica', 'ótica', 'remedio', 'remédio', 'medicamento'
  ],
  'Educação': [
    'faculdade', 'universidade', 'escola', 'colegio', 'colégio', 'curso', 'udemy',
    'alura', 'hotmart', 'kiwify', 'livro', 'livraria', 'papelaria', 'mensalidade', 'educacao'
  ],
  'Lazer': [
    'cinema', 'cinemark', 'cinepolis', 'ingresso', 'sympla', 'eventim', 'show',
    'teatro', 'steam', 'playstation', 'psn', 'xbox', 'nintendo', 'jogos', 'games', 'riot'
  ],
  'Assinaturas': [
    'netflix', 'spotify', 'amazon prime', 'disney', 'hbo', 'max', 'deezer', 'youtube premium',
    'apple.com/bill', 'icloud', 'google one', 'globo play', 'globoplay', 'paramount', 'star+'
  ],
  'Compras': [
    'amazon', 'mercado livre', 'mercadolivre', 'shopee', 'shein', 'magalu', 'magazine luiza',
    'americanas', 'casas bahia', 'zara', 'renner', 'riachuelo', 'c&a', 'centauro', 'decathlon',
    'ali express', 'aliexpress', 'lojas', 'shopping'
  ],
  'Viagens': [
    'hotel', 'booking', 'airbnb', 'decolar', 'hospedagem', 'pousada', 'resort', 'cvc'
  ],
  'Investimentos': [
    'corretora', 'xp investimentos', 'rico', 'clear', 'nu invest', 'nuinvest', 'tesouro direto', 'b3', 'inter dtvm'
  ],
  'Salário': [
    'salario', 'salário', 'folha de pagamento', 'remuneracao', 'remuneração',
    'ted recebida', 'doc recebido', 'ted c/c', 'empresa', 'prolabore', 'pró-labore', 'holerite'
  ],
  'Freelance': [
    'freela', 'servico prestado', 'prestação servico', 'honorarios', 'honorários'
  ]
};

function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function cleanDescription(desc) {
  if (!desc) return 'Lançamento';
  return desc
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;

  let s = String(val).trim();
  let isNegative = false;

  // Handle (123.45) accounting notation
  if (s.startsWith('(') && s.endsWith(')')) {
    isNegative = true;
    s = s.slice(1, -1).trim();
  } else if (s.startsWith('-')) {
    isNegative = true;
    s = s.slice(1).trim();
  } else if (s.endsWith('-')) {
    isNegative = true;
    s = s.slice(0, -1).trim();
  }

  // Remove currency signs, letters, and spaces
  s = s.replace(/[^0-9,.-]/g, '');

  // Detect decimal separator:
  // e.g. "1.234,56" -> comma is decimal
  // e.g. "1,234.56" -> period is decimal
  // e.g. "1234,56" -> comma is decimal
  // e.g. "1234.56" -> period is decimal
  if (s.includes(',') && s.includes('.')) {
    if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
      // 1.234,56
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      // 1,234.56
      s = s.replace(/,/g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(',', '.');
  }

  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNegative ? -Math.abs(num) : num;
}

function parseDateStr(raw) {
  if (!raw) return new Date().toISOString().slice(0, 10);
  const s = String(raw).trim();

  // Format 1: OFX date "YYYYMMDD..."
  if (/^\d{8}/.test(s)) {
    const y = s.slice(0, 4);
    const m = s.slice(4, 6);
    const d = s.slice(6, 8);
    return `${y}-${m}-${d}`;
  }

  // Format 2: "DD/MM/YYYY" or "DD/MM/YY"
  const brMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (brMatch) {
    const d = brMatch[1].padStart(2, '0');
    const m = brMatch[2].padStart(2, '0');
    let y = brMatch[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m}-${d}`;
  }

  // Format 3: "YYYY-MM-DD"
  const isoMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (isoMatch) {
    const y = isoMatch[1];
    const m = isoMatch[2].padStart(2, '0');
    const d = isoMatch[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Fallback to JS Date
  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    return dt.toISOString().slice(0, 10);
  }

  return new Date().toISOString().slice(0, 10);
}

export class StatementImportService {
  /**
   * Parse OFX text content
   */
  static parseOFX(rawContent) {
    const content = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const transactions = [];

    // Bank identification
    let bankName = 'Banco';
    const orgMatch = content.match(/<ORG>([^<\n]+)/i);
    const fidMatch = content.match(/<FID>([^<\n]+)/i);
    if (orgMatch && orgMatch[1].trim()) {
      bankName = orgMatch[1].trim();
    } else if (fidMatch && fidMatch[1].trim()) {
      bankName = `Banco (${fidMatch[1].trim()})`;
    }

    // Split by <STMTTRN> (transactions in both checking accounts and credit cards)
    const rawBlocks = content.split(/<STMTTRN>/i).slice(1);

    for (const rawBlock of rawBlocks) {
      // Isolate block until </STMTTRN> or next major section
      const blockEnd = rawBlock.search(/<\/STMTTRN>|<STMTTRN>/i);
      const block = blockEnd !== -1 ? rawBlock.slice(0, blockEnd) : rawBlock;

      const trntypeMatch = block.match(/<TRNTYPE>([^<\n]+)/i);
      const dtpostedMatch = block.match(/<DTPOSTED>([^<\n]+)/i);
      const trnamtMatch = block.match(/<TRNAMT>([^<\n]+)/i);
      const fitidMatch = block.match(/<FITID>([^<\n]+)/i);
      const memoMatch = block.match(/<MEMO>([^<\n]+)/i);
      const nameMatch = block.match(/<NAME>([^<\n]+)/i);

      if (!trnamtMatch) continue;

      const amountVal = parseAmount(trnamtMatch[1]);
      if (amountVal === 0) continue;

      const rawMemo = memoMatch ? memoMatch[1].trim() : '';
      const rawName = nameMatch ? nameMatch[1].trim() : '';

      let description = 'Lançamento';
      if (rawMemo && rawName) {
        if (rawMemo.toLowerCase().includes(rawName.toLowerCase())) {
          description = rawMemo;
        } else {
          description = `${rawName} - ${rawMemo}`;
        }
      } else {
        description = rawMemo || rawName || 'Lançamento';
      }

      const dateStr = dtpostedMatch ? parseDateStr(dtpostedMatch[1]) : new Date().toISOString().slice(0, 10);
      const fitid = fitidMatch ? fitidMatch[1].trim() : null;

      transactions.push({
        id: crypto.randomUUID(),
        date: dateStr,
        description: cleanDescription(description),
        amount: Math.abs(amountVal),
        type: amountVal < 0 ? 'expense' : 'income',
        fitid,
        rawAmount: amountVal
      });
    }

    return {
      bankName,
      fileType: 'OFX',
      transactions
    };
  }

  /**
   * Parse CSV content (supports Nubank, Inter, Itaú, Bradesco, etc.)
   */
  static parseCSV(rawContent) {
    const content = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = content.split('\n').filter((l) => l.trim().length > 0);

    if (lines.length < 2) {
      throw new Error('O arquivo CSV parece vazio ou sem transações.');
    }

    // Detect delimiter from first 3 lines
    const sample = lines.slice(0, 3).join('\n');
    const commaCount = (sample.match(/,/g) || []).length;
    const semiCount = (sample.match(/;/g) || []).length;
    const tabCount = (sample.match(/\t/g) || []).length;

    let delimiter = ',';
    if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
    else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(delimiter).map((h) => normalizeText(h.replace(/["']/g, '')));

    let dateIdx = -1;
    let descIdx = -1;
    let amountIdx = -1;
    let categoryIdx = -1;
    let identifierIdx = -1;

    headers.forEach((h, idx) => {
      if (dateIdx === -1 && (h.includes('data') || h === 'date' || h === 'dt')) {
        dateIdx = idx;
      } else if (descIdx === -1 && (h.includes('desc') || h.includes('hist') || h.includes('titul') || h === 'title' || h.includes('memo') || h.includes('estabelec') || h.includes('benefic'))) {
        descIdx = idx;
      } else if (amountIdx === -1 && (h.includes('valor') || h === 'amount' || h === 'value' || h.includes('total') || h.includes('quantia'))) {
        amountIdx = idx;
      } else if (categoryIdx === -1 && (h.includes('categ') || h === 'category')) {
        categoryIdx = idx;
      } else if (identifierIdx === -1 && (h.includes('identif') || h.includes('doc') || h === 'id' || h === 'fitid')) {
        identifierIdx = idx;
      }
    });

    // Fallbacks if headers weren't named standardly
    if (dateIdx === -1) dateIdx = 0;
    if (amountIdx === -1) amountIdx = headers.length > 2 ? 1 : headers.length - 1;
    if (descIdx === -1) {
      descIdx = headers.findIndex((_, idx) => idx !== dateIdx && idx !== amountIdx);
      if (descIdx === -1) descIdx = 1;
    }

    const transactions = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Handle quotes in CSV
      const cols = [];
      let inQuotes = false;
      let currentVal = '';

      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
          cols.push(currentVal.trim());
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
      cols.push(currentVal.trim());

      const rawDate = cols[dateIdx];
      const rawDesc = descIdx !== -1 ? cols[descIdx] : 'Lançamento';
      const rawAmt = cols[amountIdx];
      const rawCategory = categoryIdx !== -1 ? cols[categoryIdx] : null;
      const rawId = identifierIdx !== -1 ? cols[identifierIdx] : null;

      if (!rawDate && !rawAmt) continue;

      const amountVal = parseAmount(rawAmt);
      if (amountVal === 0 && !rawAmt) continue;

      const dateStr = parseDateStr(rawDate);
      const description = cleanDescription(rawDesc || 'Lançamento');

      transactions.push({
        id: crypto.randomUUID(),
        date: dateStr,
        description,
        amount: Math.abs(amountVal),
        type: amountVal < 0 ? 'expense' : 'income',
        fitid: rawId || null,
        csvCategory: rawCategory ? rawCategory.replace(/["']/g, '').trim() : null,
        rawAmount: amountVal
      });
    }

    return {
      bankName: 'Extrato CSV',
      fileType: 'CSV',
      transactions
    };
  }

  /**
   * Parse XLSX or XLS buffer/base64
   */
  static parseExcel(buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const csvContent = xlsx.utils.sheet_to_csv(sheet);

    const result = this.parseCSV(csvContent);
    result.fileType = 'EXCEL';
    return result;
  }

  /**
   * Main Parse Method: Detects format (OFX, CSV, Excel), parses,
   * categorizes against user's categories, and flags existing duplicates.
   */
  static async parseAndAnalyze(userId, accountId, { fileContent, fileName, isBase64 }) {
    if (!accountId || typeof accountId !== 'string' || !accountId.trim()) {
      throw new Error('É OBRIGATÓRIO selecionar a qual conta bancária este extrato pertence.');
    }

    const targetAccount = await queryOne(
      'SELECT id, name, institution, current_balance FROM accounts WHERE id = ? AND user_id = ?',
      [accountId, userId]
    );
    if (!targetAccount) {
      throw new Error('Conta bancária selecionada não foi encontrada ou não pertence ao seu usuário.');
    }

    let parsedResult;
    const nameLower = (fileName || '').toLowerCase();

    if (nameLower.endsWith('.ofx') || (typeof fileContent === 'string' && fileContent.includes('<OFX>'))) {
      const text = isBase64 ? Buffer.from(fileContent, 'base64').toString('utf-8') : fileContent;
      parsedResult = this.parseOFX(text);
    } else if (nameLower.endsWith('.xlsx') || nameLower.endsWith('.xls')) {
      const buf = isBase64 ? Buffer.from(fileContent, 'base64') : Buffer.from(fileContent);
      parsedResult = this.parseExcel(buf);
    } else {
      // Default to CSV / Text
      const text = isBase64 ? Buffer.from(fileContent, 'base64').toString('utf-8') : fileContent;
      parsedResult = this.parseCSV(text);
    }

    const { transactions, bankName, fileType } = parsedResult;

    if (!transactions || transactions.length === 0) {
      throw new Error('Nenhuma transação válida foi encontrada no arquivo.');
    }

    // 1. Fetch user's categories
    const userCategories = await queryAll(
      'SELECT id, name, type, icon, color FROM categories WHERE user_id = ? AND active = 1',
      [userId]
    );

    const catMapByName = new Map();
    userCategories.forEach((c) => {
      catMapByName.set(normalizeText(c.name), c);
    });

    // Default categories if nothing matches
    const defaultExpenseCat = userCategories.find((c) => c.type === 'expense') || userCategories[0];
    const defaultIncomeCat = userCategories.find((c) => c.type === 'income') || userCategories[0];

    // 2. Fetch existing transactions for duplicate detection
    let minDate = transactions[0].date;
    let maxDate = transactions[0].date;
    transactions.forEach((t) => {
      if (t.date < minDate) minDate = t.date;
      if (t.date > maxDate) maxDate = t.date;
    });

    const existingTxs = accountId
      ? await queryAll(
          `SELECT id, transaction_date, amount, description, notes
           FROM transactions
           WHERE user_id = ? AND account_id = ? AND transaction_date >= ? AND transaction_date <= ?`,
          [userId, accountId, minDate, maxDate]
        )
      : [];

    let totalIncome = 0;
    let totalExpense = 0;
    let duplicateCount = 0;

    const enrichedTransactions = transactions.map((tx) => {
      // A. Categorize
      let matchedCategory = null;

      // First check if CSV had category
      if (tx.csvCategory) {
        const normCsv = normalizeText(tx.csvCategory);
        if (catMapByName.has(normCsv)) {
          matchedCategory = catMapByName.get(normCsv);
        }
      }

      // Check keywords in description
      if (!matchedCategory) {
        const normDesc = normalizeText(tx.description);
        for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
          const found = keywords.some((kw) => normDesc.includes(kw));
          if (found) {
            const targetCat = catMapByName.get(normalizeText(catName));
            if (targetCat) {
              matchedCategory = targetCat;
              break;
            }
          }
        }
      }

      // Fallback
      if (!matchedCategory) {
        matchedCategory = tx.type === 'income' ? defaultIncomeCat : defaultExpenseCat;
      }

      // B. Duplicate Detection
      let isDuplicate = false;
      let duplicateReason = null;

      const dupMatch = existingTxs.find((ex) => {
        const sameDate = ex.transaction_date === tx.date;
        const sameAmount = Math.abs(parseFloat(ex.amount) - tx.amount) < 0.01;
        const fitidMatch = tx.fitid && ex.notes && ex.notes.includes(tx.fitid);
        const descMatch = normalizeText(ex.description) === normalizeText(tx.description);

        return fitidMatch || (sameDate && sameAmount && (descMatch || Math.abs(parseFloat(ex.amount) - tx.amount) < 0.001));
      });

      if (dupMatch) {
        isDuplicate = true;
        duplicateReason = 'Lançamento com mesma data e valor já existente nesta conta';
        duplicateCount++;
      }

      if (tx.type === 'income') totalIncome += tx.amount;
      else totalExpense += tx.amount;

      return {
        ...tx,
        categoryId: matchedCategory?.id || null,
        categoryName: matchedCategory?.name || 'Geral',
        categoryIcon: matchedCategory?.icon || '📦',
        isDuplicate,
        duplicateReason,
        selected: !isDuplicate // Auto-uncheck duplicates!
      };
    });

    return {
      bankName,
      fileType,
      accountInfo: {
        id: targetAccount.id,
        name: targetAccount.name,
        institution: targetAccount.institution,
        current_balance: parseFloat(targetAccount.current_balance) || 0
      },
      dateRange: { start: minDate, end: maxDate },
      summary: {
        totalCount: transactions.length,
        duplicateCount,
        newCount: transactions.length - duplicateCount,
        totalIncome,
        totalExpense,
        netBalance: totalIncome - totalExpense
      },
      transactions: enrichedTransactions
    };
  }

  /**
   * Commit selected transactions to the database & update account balance
   */
  static async confirmImport(userId, accountId, transactionsToImport) {
    if (!accountId || typeof accountId !== 'string' || !accountId.trim()) {
      throw new Error('É OBRIGATÓRIO selecionar a conta bancária de destino para a importação.');
    }
    if (!transactionsToImport || transactionsToImport.length === 0) {
      throw new Error('Nenhuma transação foi selecionada para importação.');
    }

    const account = await queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [accountId, userId]);
    if (!account) throw new Error('Conta bancária selecionada não foi encontrada ou não pertence ao seu usuário.');

    return await transaction(async () => {
      let importedCount = 0;
      let totalIncome = 0;
      let totalExpense = 0;

      for (const item of transactionsToImport) {
        const id = crypto.randomUUID();
        const amount = Math.abs(parseFloat(item.amount) || 0);
        const type = item.type === 'income' ? 'income' : 'expense';
        const date = item.date || new Date().toISOString().slice(0, 10);
        const time = '12:00:00';
        const description = (item.description || 'Lançamento importado').trim();
        const categoryId = item.categoryId || null;

        // Note with FITID tag for future deduplication
        let notes = item.notes || '';
        if (item.fitid && !notes.includes(item.fitid)) {
          notes = notes ? `${notes} [OFX:${item.fitid}]` : `[OFX:${item.fitid}]`;
        }
        if (!notes) notes = 'Importado via Extrato';

        await execute(
          `INSERT INTO transactions 
           (id, user_id, type, amount, description, category_id, account_id, payment_method, transaction_date, transaction_time, notes, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            userId,
            type,
            amount,
            description,
            categoryId,
            accountId,
            'extrato_bancario',
            date,
            time,
            notes,
            'completed'
          ]
        );

        if (type === 'income') totalIncome += amount;
        else totalExpense += amount;

        importedCount++;
      }

      // Update account current balance
      const deltaBalance = totalIncome - totalExpense;
      await execute(
        'UPDATE accounts SET current_balance = current_balance + ? WHERE id = ? AND user_id = ?',
        [deltaBalance, accountId, userId]
      );

      const updatedAccount = await queryOne('SELECT * FROM accounts WHERE id = ? AND user_id = ?', [accountId, userId]);

      return {
        success: true,
        importedCount,
        totalIncome,
        totalExpense,
        deltaBalance,
        newBalance: parseFloat(updatedAccount.current_balance) || 0,
        accountName: updatedAccount.name
      };
    });
  }
}
