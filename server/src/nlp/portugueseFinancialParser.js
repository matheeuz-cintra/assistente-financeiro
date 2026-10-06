/**
 * Motor de Processamento de Linguagem Natural Financeiro em Português
 * Reconhece intenções, extrai entidades, detecta ambiguidades, gerencia contexto e alterações.
 */

// Normalização de texto para comparação (remove acentos e pontuação)
export function normalizeText(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

// Dicionário semântico inteligente para mapeamento de termos em categorias
export const CATEGORY_KEYWORDS = {
  'Alimentação': [
    'almoco', 'almoço', 'jantar', 'janta', 'refeicao', 'refeição', 'lanche', 'ifood', 'restaurante',
    'cafe', 'café', 'padaria', 'burguer', 'hamburguer', 'lanche', 'pizza', 'sushi', 'comida',
    'alimentacao', 'alimentação', 'mcdonalds', 'subway', 'sorvete', 'acai', 'açaí'
  ],
  'Mercado': [
    'mercado', 'supermercado', 'compras', 'feira', 'sacolao', 'sacolão', 'pao de acucar',
    'carrefour', 'assai', 'assaí', 'atacadao', 'atacadão', 'hortifruti', 'mercearia'
  ],
  'Transporte': [
    'uber', '99', 'taxi', 'táxi', 'passagem', 'onibus', 'ônibus', 'metro', 'metrô', 'transporte',
    'bilhete', 'pedagio', 'pedágio', 'estacionamento', 'corrida'
  ],
  'Combustível': [
    'gasolina', 'combustivel', 'combustível', 'etanol', 'alcool', 'álcool', 'diesel', 'posto',
    'abastecer', 'abastecimento', 'ipiranga', 'shell', 'br'
  ],
  'Moradia': [
    'aluguel', 'condominio', 'condomínio', 'iptu', 'moradia', 'casa', 'apartamento', 'reforma'
  ],
  'Energia': [
    'energia', 'luz', 'eletricidade', 'enel', 'cpfl', 'cemig', 'conta de luz'
  ],
  'Água': [
    'agua', 'água', 'sabesp', 'sanepar', 'copasa', 'conta de agua', 'esgoto'
  ],
  'Internet': [
    'internet', 'fibra', 'wifi', 'wi-fi', 'banda larga', 'claro internet', 'vivo fibra'
  ],
  'Telefone': [
    'telefone', 'celular', 'recarga', 'tim', 'vivo', 'claro', 'plano celular'
  ],
  'Saúde': [
    'farmacia', 'farmácia', 'remedio', 'remédio', 'drogaria', 'medico', 'médico', 'consulta',
    'dentista', 'exame', 'psicologo', 'psicólogo', 'hospital', 'saude', 'saúde', 'plano de saude'
  ],
  'Educação': [
    'curso', 'faculdade', 'escola', 'livro', 'mensalidade', 'udemy', 'educacao', 'educação',
    'pos graduacao', 'material escolar'
  ],
  'Lazer': [
    'lazer', 'cinema', 'jogo', 'games', 'steam', 'bar', 'balada', 'festa', 'passeio',
    'show', 'ingresso', 'teatro', 'praia'
  ],
  'Assinaturas': [
    'netflix', 'spotify', 'prime', 'amazon prime', 'youtube', 'disney', 'hbo', 'max',
    'assinatura', 'streaming', 'apple', 'chatgpt'
  ],
  'Compras': [
    'compra', 'roupa', 'tenis', 'tênis', 'calcado', 'shopping', 'amazon', 'mercado livre',
    'shopee', 'shein', 'magalu', 'loja', 'eletronico'
  ],
  'Viagens': [
    'viagem', 'voo', 'aviao', 'hotel', 'pousada', 'hospedagem', 'airbnb', 'passagem aerea'
  ],
  'Impostos': [
    'imposto', 'ipva', 'irpf', 'receita federal', 'tributo', 'taxa', 'darf'
  ],
  'Investimentos': [
    'investimento', 'acoes', 'ações', 'cdb', 'tesouro', 'cripto', 'bitcoin', 'fundos', 'poupanca'
  ],
  'Salário': [
    'salario', 'salário', 'ordenado', 'adiantamento', 'quinzena', 'decimo terceiro', '13o', 'ferias'
  ],
  'Freelance': [
    'freelance', 'freela', 'projeto', 'servico', 'serviço', 'bico', 'cliente', 'honorarios'
  ]
};

// Extrator de Valores Numéricos em Português
export function extractAmount(text) {
  if (!text) return null;

  // 1. Padrões com R$, como "R$ 42,00", "R$ 3.500,50", "R$ 5", "R$89,90"
  const rsMatch = text.match(/r\$\s*([\d\.,]+)/i);
  if (rsMatch) {
    return parseCurrencyString(rsMatch[1]);
  }

  // 2. Padrões com "mil", como "5 mil", "3,5 mil", "1 milhão"
  const milMatch = text.match(/([\d\.,]+)\s*mil\b/i);
  if (milMatch) {
    const base = parseCurrencyString(milMatch[1]);
    return base ? base * 1000 : null;
  }

  // 3. Padrões com "reais", como "35 reais", "3.500 reais", "42,50 reais"
  const reaisMatch = text.match(/([\d\.,]+)\s*reais\b/i);
  if (reaisMatch) {
    return parseCurrencyString(reaisMatch[1]);
  }

  // 4. Padrões com números por extenso comuns
  const wordsMap = {
    'um': 1, 'dois': 2, 'tres': 3, 'três': 3, 'quatro': 4, 'cinco': 5,
    'dez': 10, 'quinze': 15, 'vinte': 20, 'trinta': 30, 'quarenta': 40,
    'cinquenta': 50, 'sessenta': 60, 'setenta': 70, 'oitenta': 80, 'noventa': 90,
    'cem': 100, 'duzentos': 200, 'quinhentos': 500, 'mil': 1000
  };
  const normText = normalizeText(text);
  for (const [w, val] of Object.entries(wordsMap)) {
    const rx = new RegExp(`\\b${w}\\s*reais\\b`, 'i');
    if (rx.test(normText)) {
      return val;
    }
  }

  // 5. Padrão numérico decimal explícito com vírgula: "89,90", "120,50"
  const decimalMatch = text.match(/\b\d+,\d{1,2}\b/);
  if (decimalMatch) {
    return parseCurrencyString(decimalMatch[0]);
  }

  // 6. Número isolado após palavras-chave como "gastei 500", "anota 50", "coloque 30"
  const verbNumMatch = text.match(/(?:gastei|paguei|recebi|anota|coloca|coloque|foi|custou|mais|menos)\s+([\d\.]+)(?:\s|$|,|\.)/i);
  if (verbNumMatch) {
    return parseCurrencyString(verbNumMatch[1]);
  }

  // 7. Qualquer número inteiro relevante na frase
  const anyNumMatch = text.match(/\b(\d{1,6})\b/);
  if (anyNumMatch) {
    return parseFloat(anyNumMatch[1]);
  }

  return null;
}

function parseCurrencyString(str) {
  if (!str) return null;
  let clean = str.trim();
  // Se tem ponto e vírgula: 3.500,50
  if (clean.includes('.') && clean.includes(',')) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else if (clean.includes(',')) {
    // Se só tem vírgula: 89,90 -> 89.90
    clean = clean.replace(',', '.');
  } else if (clean.includes('.')) {
    // Pode ser milhar (3.500) ou decimal (3.50)
    const parts = clean.split('.');
    if (parts[parts.length - 1].length === 3) {
      // É milhar: 3.500 -> 3500
      clean = clean.replace(/\./g, '');
    }
  }
  const val = parseFloat(clean);
  return isNaN(val) ? null : Math.round(val * 100) / 100;
}

// Extrator de Data
export function extractDate(text) {
  const norm = normalizeText(text);
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  if (norm.includes('anteontem')) {
    const d = new Date(now);
    d.setDate(now.getDate() - 2);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (norm.includes('ontem')) {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (norm.includes('amanha') || norm.includes('amanhã')) {
    const d = new Date(now);
    d.setDate(now.getDate() + 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Padrão "dia 10", "dia 25"
  const dayMatch = norm.match(/\bdia\s+(\d{1,2})\b/);
  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      return `${year}-${pad(month)}-${pad(day)}`;
    }
  }

  // Padrão de data completa DD/MM/AAAA ou DD/MM
  const dateMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
  if (dateMatch) {
    const day = pad(dateMatch[1]);
    const month = pad(dateMatch[2]);
    const year = dateMatch[3] ? (dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]) : now.getFullYear();
    return `${year}-${month}-${day}`;
  }

  // Padrão hoje (padrão)
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Identificador de Tipo (Receita vs Despesa)
export function detectType(text) {
  const norm = normalizeText(text);

  const incomeTriggers = [
    'recebi', 'ganhei', 'salario', 'salário', 'freelance', 'freela', 'reembolso',
    'rendimento', 'venda', 'vendi', 'caiu na conta', 'entrou', 'recebimento'
  ];

  for (const trigger of incomeTriggers) {
    if (norm.includes(trigger)) {
      return 'income';
    }
  }

  return 'expense';
}

// Identificador de Forma de Pagamento e Menção a Cartão/Conta
export function extractPaymentDetails(text, accounts = [], creditCards = []) {
  const norm = normalizeText(text);

  let paymentMethod = 'nao_informado';
  let accountId = null;
  let creditCardId = null;

  if (norm.includes('pix')) {
    paymentMethod = 'pix';
  } else if (norm.includes('debito') || norm.includes('débito')) {
    paymentMethod = 'debito';
  } else if (norm.includes('credito') || norm.includes('crédito') || norm.includes('no cartao') || norm.includes('no cartão')) {
    paymentMethod = 'credito';
  } else if (norm.includes('dinheiro') || norm.includes('em especie') || norm.includes('em espécie')) {
    paymentMethod = 'dinheiro';
  } else if (norm.includes('boleto')) {
    paymentMethod = 'boleto';
  } else if (norm.includes('transferencia') || norm.includes('transferência') || norm.includes('ted') || norm.includes('doc')) {
    paymentMethod = 'transferencia';
  }

  // Identificação do Cartão de Crédito
  for (const card of creditCards) {
    const cardNorm = normalizeText(card.name);
    const instNorm = normalizeText(card.institution);
    if (norm.includes(cardNorm) || (instNorm.length > 2 && norm.includes(instNorm) && (norm.includes('cartao') || norm.includes('crédito') || norm.includes('credito')))) {
      creditCardId = card.id;
      paymentMethod = 'credito';
      break;
    }
  }

  // Se mencionou apenas "cartao" ou "no cartao" e não especificou, pega o primeiro cartão do usuário
  if (!creditCardId && (norm.includes('no cartao') || norm.includes('no cartão') || norm.includes('no credito') || norm.includes('no crédito')) && creditCards.length > 0) {
    creditCardId = creditCards[0].id;
    paymentMethod = 'credito';
  }

  // Identificação de Conta Bancária
  for (const acc of accounts) {
    const accNorm = normalizeText(acc.name);
    const instNorm = normalizeText(acc.institution);
    if (norm.includes(accNorm) || (instNorm.length > 2 && norm.includes(instNorm) && !creditCardId)) {
      accountId = acc.id;
      break;
    }
  }

  return { paymentMethod, accountId, creditCardId };
}

// Identificador de Categoria
export function extractCategory(text, userCategories = []) {
  const norm = normalizeText(text);

  // 1. Tenta correspondência direta com o nome das categorias do usuário
  for (const cat of userCategories) {
    const catNorm = normalizeText(cat.name);
    const rx = new RegExp(`\\b${catNorm}\\b`, 'i');
    if (rx.test(norm)) {
      return cat;
    }
  }

  // 2. Mapeamento por palavras-chave do dicionário
  for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const rx = new RegExp(`\\b${kw}\\b`, 'i');
      if (rx.test(norm)) {
        // Encontra a categoria do usuário correspondente
        const found = userCategories.find(c => normalizeText(c.name) === normalizeText(catName));
        if (found) return found;
      }
    }
  }

  return null;
}

// Extrator de Descrição Amigável
export function extractDescription(text, type, categoryName) {
  let clean = text
    .replace(/r\$\s*[\d\.,]+/gi, '')
    .replace(/[\d\.,]+\s*reais\b/gi, '')
    .replace(/\b(?:anota|anote|coloca|coloque|gastei|paguei|recebi|de|no|na|com|para|meu|minha|ontem|hoje|cartao|cartão|nubank|inter|itau|itaú)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (clean.length >= 2) {
    // Capitaliza primeira letra
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  if (categoryName) {
    return categoryName;
  }

  return type === 'income' ? 'Receita' : 'Despesa';
}

/**
 * Função Principal de Interpretação:
 * Analisa a frase, o contexto anterior do usuário e seus dados (categorias, contas, cartões).
 */
export function parseFinancialInput(rawText, userContext = {}, userCategories = [], userAccounts = [], userCards = []) {
  const text = rawText.trim();
  const norm = normalizeText(text);

  // -------------------------------------------------------------
  // 1. RESPOSTA A CONTEXTO PENDENTE (AMBIGUIDADE / CONFIRMAÇÃO)
  // -------------------------------------------------------------
  if (userContext.pending_action) {
    // Caso 1.1: O sistema estava esperando a categoria/descrição de um gasto pendente
    if (userContext.pending_action === 'clarify_category' && userContext.pending_payload) {
      const payload = typeof userContext.pending_payload === 'string'
        ? JSON.parse(userContext.pending_payload)
        : userContext.pending_payload;

      const cat = extractCategory(text, userCategories);
      const desc = extractDescription(text, payload.type, cat ? cat.name : null);

      return {
        intent: 'register_transaction',
        isFollowUp: true,
        data: {
          type: payload.type || 'expense',
          amount: payload.amount,
          categoryId: cat ? cat.id : null,
          categoryName: cat ? cat.name : 'Outros',
          categoryIcon: cat ? cat.icon : '📦',
          description: desc || (cat ? cat.name : 'Despesa'),
          date: payload.date || extractDate('hoje'),
          paymentMethod: payload.paymentMethod || 'nao_informado',
          accountId: payload.accountId || null,
          creditCardId: payload.creditCardId || null
        }
      };
    }

    // Caso 1.2: Confirmação de exclusão
    if (userContext.pending_action === 'confirm_delete' && userContext.pending_payload) {
      const isYes = norm.match(/\b(sim|pode|confirma|confirmar|apaga|excluir|com certeza)\b/);
      const isNo = norm.match(/\b(nao|não|cancela|cancelar|deixa|deixa quieto)\b/);

      if (isYes) {
        const payload = typeof userContext.pending_payload === 'string'
          ? JSON.parse(userContext.pending_payload)
          : userContext.pending_payload;
        return {
          intent: 'execute_delete_transaction',
          targetId: payload?.transactionId,
          confirmed: true
        };
      } else if (isNo) {
        return {
          intent: 'cancel_action',
          message: 'Operação cancelada. O lançamento foi mantido intacto.'
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 2. CORREÇÃO CONTEXTUAL ("Não, foi R$ 50", "Foi no mercado")
  // -------------------------------------------------------------
  if (norm.startsWith('nao,') || norm.startsWith('não,') || norm.startsWith('nao foi') || norm.startsWith('foi na verdade') || norm.startsWith('foi no ') || norm.startsWith('foi na ')) {
    const newAmount = extractAmount(text);
    const cat = extractCategory(text, userCategories);
    if (userContext.last_transaction_id) {
      return {
        intent: 'update_last_transaction',
        targetId: userContext.last_transaction_id,
        updates: {
          amount: newAmount,
          category: cat
        }
      };
    }
  }

  // -------------------------------------------------------------
  // 3. COMANDOS DE ALTERAÇÃO EXPLÍCITOS (Seção 5)
  // -------------------------------------------------------------
  // "Corrige o último gasto para R$ 30" / "Esse gasto de R$ 100 foi na verdade R$ 80"
  if (norm.includes('corrige') || norm.includes('corrigir') || norm.includes('muda') || norm.includes('altera') || norm.includes('foi na verdade')) {
    const newAmount = extractAmount(text);
    const cat = extractCategory(text, userCategories);
    const { creditCardId } = extractPaymentDetails(text, userAccounts, userCards);

    // "Muda o gasto do Uber de ontem para transporte"
    let targetKeyword = null;
    if (norm.includes('uber')) targetKeyword = 'Uber';
    else if (norm.includes('mercado')) targetKeyword = 'Mercado';

    return {
      intent: 'update_transaction',
      targetKeyword,
      updates: {
        amount: newAmount,
        category: cat,
        creditCardId: creditCardId
      }
    };
  }

  // "Apaga meu último lançamento" / "Exclui o último gasto"
  if (norm.includes('apaga') || norm.includes('apagar') || norm.includes('exclui') || norm.includes('excluir') || norm.includes('deleta')) {
    return {
      intent: 'request_delete_last'
    };
  }

  // -------------------------------------------------------------
  // 4. TRANSFERÊNCIAS ENTRE CONTAS (Seção 9)
  // "Transferi R$ 500 da conta Inter para o Nubank"
  // "Transfere 300 reais do Nubank para o Inter"
  // -------------------------------------------------------------
  if (norm.includes('transferi') || norm.includes('transfere') || norm.includes('transferencia') || norm.includes('transferência')) {
    const amount = extractAmount(text);
    let sourceAccount = null;
    let destAccount = null;

    // Procura padrões: "do X para o Y" ou "da conta X para a conta Y"
    for (const acc of userAccounts) {
      const aNorm = normalizeText(acc.name);
      const instNorm = normalizeText(acc.institution);
      const simpleName = aNorm.replace(/\bconta\b/g, '').trim();

      const names = [aNorm, instNorm, simpleName].filter(Boolean);
      for (const n of names) {
        const fromRx = new RegExp(`\\b(?:do|da|de)\\s+(?:a\\s+|o\\s+|conta\\s+)?${n}\\b`, 'i');
        const toRx = new RegExp(`\\b(?:para|pra|pro|ao?)\\s+(?:a\\s+|o\\s+|conta\\s+)?${n}\\b`, 'i');

        if (fromRx.test(norm)) {
          sourceAccount = acc;
        }
        if (toRx.test(norm)) {
          destAccount = acc;
        }
      }
    }

    // Se encontrou as duas contas mas não com as preposições explícitas
    if ((!sourceAccount || !destAccount || sourceAccount.id === destAccount.id)) {
      const matches = userAccounts.filter(a => {
        const aNorm = normalizeText(a.name);
        const instNorm = normalizeText(a.institution);
        const simpleName = aNorm.replace(/\bconta\b/g, '').trim();
        return (
          norm.includes(aNorm) ||
          norm.includes(instNorm) ||
          (simpleName.length > 2 && norm.includes(simpleName))
        );
      });
      if (matches.length >= 2) {
        sourceAccount = matches[0];
        destAccount = matches[1];
      }
    }

    if (!amount) {
      return {
        intent: 'ambiguous_transfer',
        message: 'Qual valor você deseja transferir?'
      };
    }

    if (!sourceAccount || !destAccount) {
      return {
        intent: 'ambiguous_transfer',
        amount,
        message: 'Por favor, indique as contas de origem e destino (ex: "Transfere 300 reais do Nubank para o Inter").'
      };
    }

    return {
      intent: 'register_transfer',
      data: {
        amount,
        sourceAccountId: sourceAccount.id,
        sourceAccountName: sourceAccount.name,
        destinationAccountId: destAccount.id,
        destinationAccountName: destAccount.name,
        date: extractDate(text),
        description: `Transferência de ${sourceAccount.name} para ${destAccount.name}`
      }
    };
  }

  // -------------------------------------------------------------
  // 5. RECORRÊNCIAS / ASSINATURAS (Seção 11)
  // "Minha internet custa R$ 100 todo dia 10"
  // "Cria uma despesa mensal de R$ 120 para minha academia"
  // "Cancelar minha assinatura da Netflix"
  // -------------------------------------------------------------
  if (norm.includes('cancelar minha assinatura') || norm.includes('cancela a assinatura') || norm.includes('cancelar assinatura')) {
    const item = norm.replace(/.*assinatura (?:da |do )?/i, '').trim();
    return {
      intent: 'cancel_recurring',
      keyword: item
    };
  }

  if (norm.includes('todo dia') || norm.includes('despesa mensal') || norm.includes('recorrente') || norm.includes('mensal de')) {
    const amount = extractAmount(text);
    const dayMatch = norm.match(/(?:todo\s+dia|dia)\s+(\d{1,2})/);
    const dueDay = dayMatch ? parseInt(dayMatch[1], 10) : 10;
    const cat = extractCategory(text, userCategories);
    const desc = extractDescription(text, 'expense', cat ? cat.name : null);

    return {
      intent: 'register_recurring',
      data: {
        description: desc,
        amount: amount || 0,
        type: 'expense',
        categoryId: cat ? cat.id : null,
        categoryName: cat ? cat.name : 'Assinaturas',
        frequency: 'monthly',
        dueDay,
        startDate: extractDate('hoje')
      }
    };
  }

  // -------------------------------------------------------------
  // 6. COMANDOS DE CONSULTA (Seção 4)
  // -------------------------------------------------------------
  if (norm.startsWith('quanto ') || norm.includes('qual foi') || norm.includes('me mostra') || norm.includes('quais contas')) {
    // "Quanto gastei esse mês?"
    if (norm.includes('esse mes') || norm.includes('este mes') || norm.includes('gastei este mes') || norm.includes('gastei esse mes')) {
      return { intent: 'query_monthly_expenses' };
    }
    // "Quanto gastei com comida?" / "Quanto gastei no mercado esse mês?"
    const cat = extractCategory(text, userCategories);
    if (cat) {
      return {
        intent: 'query_category_expenses',
        category: cat
      };
    }
    // "Qual foi meu maior gasto?"
    if (norm.includes('maior gasto') || norm.includes('maior despesa')) {
      return { intent: 'query_highest_expense' };
    }
    // "Quanto ainda posso gastar esse mês?"
    if (norm.includes('posso gastar') || norm.includes('resta') || norm.includes('orcamento') || norm.includes('orçamento')) {
      return { intent: 'query_budget_remaining' };
    }
    // "Quanto recebi esse mês?"
    if (norm.includes('recebi') || norm.includes('ganhei')) {
      return { intent: 'query_monthly_income' };
    }
    // "Quanto gastei semana passada?"
    if (norm.includes('semana passada')) {
      return { intent: 'query_last_week_expenses' };
    }
    // "Quanto gastei no cartão?"
    if (norm.includes('cartao') || norm.includes('cartão') || norm.includes('fatura')) {
      return { intent: 'query_card_expenses' };
    }
    // "Quanto tenho disponível?" / "Qual meu saldo?"
    if (norm.includes('disponivel') || norm.includes('disponível') || norm.includes('saldo')) {
      return { intent: 'query_balance' };
    }
    // "Quais contas tenho para pagar?"
    if (norm.includes('contas') || norm.includes('pagar') || norm.includes('vencimento')) {
      return { intent: 'query_upcoming_bills' };
    }
    // "Me mostra meus gastos de outubro"
    const months = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
    for (let i = 0; i < months.length; i++) {
      if (norm.includes(months[i])) {
        return {
          intent: 'query_month_expenses',
          month: i + 1,
          monthName: months[i]
        };
      }
    }
  }

  // -------------------------------------------------------------
  // 7. LANÇAMENTO PADRÃO DE RECEITA OU DESPESA (Seções 2, 3, 27)
  // -------------------------------------------------------------
  const amount = extractAmount(text);
  const type = detectType(text);
  const category = extractCategory(text, userCategories);
  const { paymentMethod, accountId, creditCardId } = extractPaymentDetails(text, userAccounts, userCards);
  const date = extractDate(text);
  const description = extractDescription(text, type, category ? category.name : null);

  // DETECÇÃO DE AMBIGUIDADE (Seção 3 e 27):
  // Ex: "gastei 500" ou "anota 50 reais" sem nenhuma informação de categoria ou descrição
  const isAmbiguous = (
    amount &&
    !category &&
    (description === 'Despesa' || description === 'Receita' || description === '' || norm === `gastei ${amount}` || norm === `anota ${amount}`)
  );

  if (isAmbiguous) {
    return {
      intent: 'ambiguous_expense',
      data: {
        amount,
        type,
        date,
        paymentMethod,
        accountId,
        creditCardId
      },
      message: `Posso registrar R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} como ${type === 'income' ? 'receita' : 'despesa'}. Qual foi a categoria ou com o que você gastou?`
    };
  }

  if (amount) {
    return {
      intent: 'register_transaction',
      data: {
        type,
        amount,
        categoryId: category ? category.id : null,
        categoryName: category ? category.name : (type === 'income' ? 'Outras Receitas' : 'Outros'),
        categoryIcon: category ? category.icon : (type === 'income' ? '💰' : '📦'),
        description,
        date,
        paymentMethod,
        accountId,
        creditCardId
      }
    };
  }

  // Fallback se não detectou valor
  return {
    intent: 'unrecognized',
    message: 'Não identifiquei o valor da transação. Você pode falar algo como "Gastei R$ 35 no almoço" ou "Recebi R$ 3.500 de salário".'
  };
}
