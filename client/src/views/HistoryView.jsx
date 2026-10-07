import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Tag, CreditCard, ArrowDownRight, ArrowUpRight, RefreshCw, X, FileSpreadsheet } from 'lucide-react';
import { apiClient } from '../api/client.js';

export function HistoryView({ onSelectTransaction, hideValues, onOpenImport }) {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('month'); // 'today', 'week', 'month', 'all'
  const [type, setType] = useState(''); // '', 'expense', 'income'
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedCard, setSelectedCard] = useState('');
  const [showFiltersModal, setShowFiltersModal] = useState(false);

  useEffect(() => {
    loadFiltersResources();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [search, period, type, selectedCategory, selectedAccount, selectedCard]);

  const loadFiltersResources = async () => {
    try {
      const [cats, accs, cards] = await Promise.all([
        apiClient.getCategories(),
        apiClient.getAccounts(),
        apiClient.getCreditCards()
      ]);
      setCategories(cats);
      setAccounts(accs);
      setCreditCards(cards);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getTransactions({
        search,
        period: period === 'all' ? undefined : period,
        type: type || undefined,
        categoryId: selectedCategory || undefined,
        accountId: selectedAccount || undefined,
        creditCardId: selectedCard || undefined
      });
      setTransactions(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmtBRL = (val) => {
    if (hideValues) return '••••••';
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Group transactions by date
  const grouped = transactions.reduce((acc, tx) => {
    const d = tx.transaction_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {});

  const totalFilteredExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalFilteredIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const getDayLabel = (dateStr) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yestStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === yestStr) return 'Ontem';

    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="flex-1 pb-24 px-4 pt-3 space-y-3.5 animate-in fade-in duration-200">
      {/* Title & Quick Search Bar */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">Histórico de Lançamentos</h2>
        <p className="text-xs text-slate-400">Consulte, filtre e gerencie seus registros</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por Uber, Mercado, Netflix..."
            className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFiltersModal(true)}
          className={`px-3 py-2.5 rounded-2xl border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
            selectedCategory || selectedAccount || selectedCard
              ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Filter size={14} />
          Filtros
        </button>

        <button
          type="button"
          onClick={() => onOpenImport?.()}
          className="px-3 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 shadow-xs"
          title="Importar extrato bancário (OFX / CSV)"
        >
          <FileSpreadsheet size={14} className="text-emerald-400" />
          Importar
        </button>
      </div>

      {/* Period Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {[
          { id: 'month', label: 'Este Mês' },
          { id: 'today', label: 'Hoje' },
          { id: 'week', label: 'Esta Semana' },
          { id: 'all', label: 'Todos' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
              period === p.id
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {[
          { id: '', label: 'Tudo' },
          { id: 'expense', label: 'Despesas' },
          { id: 'income', label: 'Receitas' }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setType(t.id)}
            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
              type === t.id
                ? t.id === 'expense'
                  ? 'bg-rose-600 text-white'
                  : t.id === 'income'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Total Filtered Summary Pill */}
      <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-2xs flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Despesas no filtro</span>
          <span className="font-extrabold text-rose-600">{fmtBRL(totalFilteredExpense)}</span>
        </div>
        <div className="h-6 w-px bg-slate-100" />
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Receitas no filtro</span>
          <span className="font-extrabold text-emerald-600">{fmtBRL(totalFilteredIncome)}</span>
        </div>
        <div className="h-6 w-px bg-slate-100" />
        <div>
          <span className="text-[10px] text-slate-400 block font-medium">Total itens</span>
          <span className="font-extrabold text-slate-700">{transactions.length}</span>
        </div>
      </div>

      {/* Transactions Grouped List */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-xs">
          <RefreshCw size={24} className="animate-spin text-emerald-600 mx-auto mb-2" />
          Buscando transações...
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl p-6 border border-slate-100 text-slate-400 text-xs">
          Nenhuma transação encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([dateStr, items]) => (
            <div key={dateStr} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">
                {getDayLabel(dateStr)} ({dateStr})
              </span>

              <div className="divide-y divide-slate-100">
                {items.map((tx) => {
                  const isExpense = tx.type === 'expense';
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-xl px-1.5 transition-colors active:scale-98"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                          style={{ backgroundColor: `${tx.category_color || '#64748b'}20` }}
                        >
                          {tx.category_icon || '🏷️'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-800 block truncate max-w-[170px]">
                            {tx.description}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            {tx.category_name || 'Geral'} • {tx.credit_card_name || tx.account_name || 'Geral'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`text-xs font-extrabold block ${
                            isExpense ? 'text-rose-600' : 'text-emerald-600'
                          }`}
                        >
                          {isExpense ? '-' : '+'} {fmtBRL(tx.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {tx.transaction_time || '12:00'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advanced Filter Modal */}
      {showFiltersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold text-slate-800">Filtrar Lançamentos</h3>
              <button onClick={() => setShowFiltersModal(false)} className="text-slate-400">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Por Categoria</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="">Todas as Categorias</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Por Conta Bancária</label>
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="">Todas as Contas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Por Cartão de Crédito</label>
              <select
                value={selectedCard}
                onChange={(e) => setSelectedCard(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="">Todos os Cartões</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    💳 {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSelectedAccount('');
                  setSelectedCard('');
                  setShowFiltersModal(false);
                }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600"
              >
                Limpar
              </button>
              <button
                onClick={() => setShowFiltersModal(false)}
                className="flex-1 py-2 rounded-xl bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
