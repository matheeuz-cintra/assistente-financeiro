# 📱 FinAI — Assistente Financeiro Pessoal Mobile-First

> Aplicativo móvel moderno de controle financeiro pessoal com experiência visual, intuitiva e **assistente por voz e linguagem natural**. Permite registrar despesas, receitas, transferências e consultar finanças simplesmente conversando ou falando.

---

## 🌟 Destaques do Produto

- **Lançamento por Linguagem Natural e Voz**:
  - Reconhecimento de voz em tempo real através da **Web Speech API** com animação pulsante.
  - O usuário simplesmente fala ou digita: *"Gastei R$ 35 no almoço"*, *"Coloca 50 reais de gasolina no cartão"*, *"Recebi 800 reais de freelance"*.
  - O assistente extrai automaticamente: **tipo**, **valor**, **categoria**, **descrição**, **data/hora**, **conta**, **cartão**, **forma de pagamento**.
- **Confirmação Inteligente & Tratamento de Ambiguidade**:
  - Entradas claras são registradas instantaneamente (*"Registrado 🚗 R$ 25,00 • Transporte"*).
  - Entradas ambíguas pedem esclarecimento sem inventar dados (*"Gastei 500"* ➔ *"Posso registrar R$ 500,00 como despesa. Qual foi a categoria?"*).
  - Permite correções contextuais no mesmo lançamento sem duplicar (*"Não, foi R$ 50"* ou *"Foi no mercado"*).
- **Comandos de Consulta**:
  - *"Quanto gastei esse mês?"*
  - *"Quanto gastei com comida?"*
  - *"Qual foi meu maior gasto?"*
  - *"Quanto ainda posso gastar esse mês?"*
  - *"Quanto tenho disponível?"*
  - *"Quais contas tenho para pagar?"*
- **Comandos de Alteração & Exclusão Segura**:
  - *"Corrige o último gasto para R$ 30"*
  - *"Muda o gasto do Uber de ontem para transporte"*
  - *"Apaga meu último lançamento"* ➔ Pede confirmação explícita antes de excluir!
- **Transferências entre Contas**:
  - *"Transferi R$ 500 da conta Inter para o Nubank"* ➔ Não é contabilizado como despesa; atualiza os saldos das duas contas de forma atômica no banco de dados.
- **Despesas Recorrentes & Assinaturas**:
  - *"Minha internet custa R$ 100 todo dia 10"*
  - *"Cria uma despesa mensal de R$ 120 para minha academia"*
  - *"Cancelar minha assinatura da Netflix"*
- **Dashboard Financeiro Mobile Premium**:
  - Saldo total com botão para ocultar valores (modo privacidade 👁️).
  - Resumo de Receitas, Despesas e Resultado do mês.
  - Gastos por Categoria com barras de progresso proporcionais e cores.
  - Orçamentos por categoria com alertas visuais (amarelo >80%, vermelho >100%).
  - Cartões de Crédito com limites utilizados, disponíveis e faturas abertas.
  - Próximos vencimentos de contas e assinaturas.
  - Histórico recente agrupado por data com toque para abrir modal de detalhes.
- **Relatórios & Exportação**:
  - Gráficos de evolução mensal (últimos 6 meses).
  - Insights de inteligência financeira gerados a partir dos dados reais armazenados.
  - Exportação para **Excel (.xlsx)** com múltiplas abas e **CSV**.

---

## 🛠️ Arquitetura e Tecnologias

```
c:\Antigravity
├── client/                     # Frontend Mobile-First (SPA)
│   ├── src/
│   │   ├── api/client.js       # Cliente HTTP com JWT e download de arquivos
│   │   ├── context/AuthContext # Estado global de autenticação
│   │   ├── components/         # Header, BottomNav, QuickAddModal, TransactionDetailModal
│   │   ├── views/              # DashboardView, ChatView, HistoryView, ReportsView, MoreView, LoginView
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js          # Vite + TailwindCSS v4 + API Proxy
├── server/                     # Backend API & NLP
│   ├── src/
│   │   ├── config/index.js     # Variáveis de ambiente e portas
│   │   ├── db/
│   │   │   ├── schema.sql      # DDL SQLite completo
│   │   │   ├── database.js     # Conexão nativa node:sqlite (WAL mode)
│   │   │   └── seed.js         # Dados iniciais e categorias padrão
│   │   ├── nlp/
│   │   │   └── portugueseFinancialParser.js # Motor NLP e máquina de estados em PT-BR
│   │   ├── services/           # AuthService, TransactionService, TransferService, etc.
│   │   ├── middleware/         # Autenticação JWT e proteção de rotas
│   │   ├── routes/api.js       # Rotas REST
│   │   └── index.js            # Servidor Express e hosting do frontend
│   └── test/                   # Testes unitários de NLP e testes E2E
└── package.json                # Scripts centralizados
```

### Principais Decisões Técnicas:
1. **Frontend**: React 19 + Vite 8 + Tailwind CSS v4 + Lucide Icons + Web Speech API. Design 100% responsivo otimizado para celulares (viewport móvel nativo).
2. **Backend**: Node.js v24 com Express e arquitetura modular de serviços.
3. **Banco de Dados**: `node:sqlite` nativo (módulo C++ embutido no Node 24), sem dependências nativas externas, com transações atômicas ACID e índices de performance.
4. **NLP Financeiro em Português**: Motor próprio de gramática financeira brasileira, parser numérico (suportando formatos com vírgula, milhar, texto por extenso), reconhecimento de entidades bancárias e detecção de ambiguidade com persistência de contexto por usuário.

---

## 🚀 Como Executar o Projeto

O servidor já se encontra em execução em segundo plano na porta **3001**.

Para acessar imediatamente:
Abra seu navegador em: **[http://localhost:3001](http://localhost:3001)**

### Credenciais da Conta de Demonstração:
- **E-mail:** `demo@finai.com`
- **Senha:** `123456`
*(Ou clique no botão verde "Entrar como Conta Demonstração" na tela de login)*

### Comandos Úteis:
```powershell
# Executar os testes de NLP
npm run test:nlp

# Executar os testes de integração do Backend
npm test

# Executar a suíte HTTP End-to-End
node server/test/test_http_e2e.js

# Recompilar o frontend
npm run build

# Iniciar o servidor
npm start
```

---

## 🔒 Modelo de Dados (SQLite)

O banco de dados SQLite foi modelado com isolamento rigoroso por `user_id`:
- `users`: Usuários e hash seguro de senhas (bcrypt).
- `accounts`: Contas financeiras (Nubank, Inter, Dinheiro, etc.) com saldos sincronizados a cada transação/transferência.
- `credit_cards`: Cartões com limites totais, utilizados e disponíveis.
- `categories`: Categorias padrão e personalizadas (ícone emoji, cor, tipo receita/despesa).
- `transactions`: Lançamentos com valores, forma de pagamento, categorias, contas e cartões associados.
- `transfers`: Histórico de transferências entre contas.
- `recurring_transactions`: Assinaturas e contas recorrentes com dia de vencimento.
- `budgets`: Orçamentos mensais com verificação de limites.
- `chat_messages`: Histórico de conversa e metadados das ações da IA.
- `conversation_context`: Contexto ativo da conversa (último lançamento, confirmações pendentes).
