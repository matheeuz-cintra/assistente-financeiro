import React, { useState, useEffect } from 'react';
import { 
  Wallet, CreditCard, Calendar, Target, Tags, KeyRound, 
  LogOut, Plus, ChevronRight, Check, X, Trash2, Edit2, ShieldCheck, Download, FileSpreadsheet, UploadCloud, Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiClient } from '../api/client.js';

export function MoreView({ onDataChanged, onOpenImport, onOpenInstall }) {
  const { user, logout } = useAuth();
  const [section, setSection] = useState('menu'); // 'menu', 'accounts', 'cards', 'recurring', 'budgets', 'categories', 'settings'

  // Resources state
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [recurring, setRecurring] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal / Creation state
  const [newAccName, setNewAccName] = useState('');
  const [newAccBalance, setNewAccBalance] = useState('');
  const [newAccInst, setNewAccInst] = useState('');

  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState('');
  const [newCardDue, setNewCardDue] = useState('5');

  const [newRecDesc, setNewRecDesc] = useState('');
  const [newRecAmount, setNewRecAmount] = useState('');
  const [newRecDueDay, setNewRecDueDay] = useState('10');

  const [newBudgetCatId, setNewBudgetCatId] = useState('');
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editingBudgetAmount, setEditingBudgetAmount] = useState('');

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');
  const [newCatColor, setNewCatColor] = useState('#10b981');
  const [newCatType, setNewCatType] = useState('expense');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [accs, cds, recs, bdgs, cats] = await Promise.all([
        apiClient.getAccounts(),
        apiClient.getCreditCards(),
        apiClient.getRecurring(),
        apiClient.getBudgets(),
        apiClient.getCategories()
      ]);
      setAccounts(accs);
      setCards(cds);
      setRecurring(recs);
      setBudgets(bdgs);
      setCategories(cats);
      if (cats.length > 0 && !newBudgetCatId) setNewBudgetCatId(cats[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const notifyChange = () => {
    loadAll();
    if (onDataChanged) onDataChanged();
  };

  // Create Handlers
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAccName) return;
    await apiClient.createAccount({
      name: newAccName,
      institution: newAccInst || 'Outro',
      initial_balance: parseFloat(newAccBalance) || 0
    });
    setNewAccName('');
    setNewAccBalance('');
    setNewAccInst('');
    notifyChange();
  };

  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!newCardName) return;
    await apiClient.createCreditCard({
      name: newCardName,
      institution: 'Outro',
      credit_limit: parseFloat(newCardLimit) || 1000,
      due_day: parseInt(newCardDue, 10) || 5
    });
    setNewCardName('');
    setNewCardLimit('');
    notifyChange();
  };

  const handleCreateRecurring = async (e) => {
    e.preventDefault();
    if (!newRecDesc) return;
    await apiClient.createRecurring({
      description: newRecDesc,
      amount: parseFloat(newRecAmount) || 0,
      dueDay: parseInt(newRecDueDay, 10) || 10
    });
    setNewRecDesc('');
    setNewRecAmount('');
    notifyChange();
  };

  const handleSetBudget = async (e) => {
    e.preventDefault();
    if (!newBudgetCatId || !newBudgetAmount) return;
    await apiClient.setBudget({
      categoryId: newBudgetCatId,
      amount: parseFloat(newBudgetAmount) || 0
    });
    setNewBudgetAmount('');
    notifyChange();
  };

  const handleUpdateBudget = async (id, amount) => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      alert('Por favor, informe um valor válido maior que zero.');
      return;
    }
    await apiClient.updateBudget(id, { amount: val });
    setEditingBudgetId(null);
    notifyChange();
  };

  const handleDeleteBudget = async (id, catName) => {
    if (confirm(`Remover o teto de orçamento para ${catName}?`)) {
      await apiClient.deleteBudget(id);
      if (editingBudgetId === id) setEditingBudgetId(null);
      notifyChange();
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName) return;
    await apiClient.createCategory({
      name: newCatName,
      type: newCatType,
      icon: newCatIcon,
      color: newCatColor
    });
    setNewCatName('');
    notifyChange();
  };

  const fmtBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // -----------------------------------------------------------
  // MAIN MENU VIEW
  // -----------------------------------------------------------
  if (section === 'menu') {
    return (
      <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-200">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Mais Opções</h2>
          <p className="text-xs text-slate-400">Gerenciamento de contas, cartões e regras</p>
        </div>

        {/* User Card */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md shadow-emerald-500/20">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <span className="text-sm font-bold text-slate-800 block">{user?.name}</span>
              <span className="text-xs text-slate-400 block">{user?.email}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors"
            title="Sair da conta"
          >
            <LogOut size={18} />
          </button>
        </div>

        {/* PWA Install Button Card */}
        {onOpenInstall && (
          <button
            type="button"
            onClick={onOpenInstall}
            className="w-full p-4 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-slate-900 text-white flex items-center justify-between shadow-lg shadow-emerald-900/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
                <Smartphone size={20} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs block text-white">Instalar no Celular</span>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-white/20 text-emerald-200">100% Grátis</span>
                </div>
                <span className="text-[11px] text-emerald-100 block mt-0.5">
                  Adicione à tela inicial para usar em tela cheia
                </span>
              </div>
            </div>
            <ChevronRight size={18} className="text-emerald-200" />
          </button>
        )}

        {/* Navigation List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-xs divide-y divide-slate-100 overflow-hidden text-xs">
          <button
            onClick={() => setSection('accounts')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Wallet size={16} />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block">Contas Bancárias</span>
                <span className="text-[11px] text-slate-400">{accounts.length} contas cadastradas</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => onOpenImport?.()}
            className="w-full p-4 flex items-center justify-between hover:bg-emerald-50/50 transition-colors bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-transparent"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                <FileSpreadsheet size={16} />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-800 block">Importar Extrato Bancário</span>
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-emerald-600 text-white">OFX / CSV</span>
                </div>
                <span className="text-[11px] text-slate-400">Nubank, Inter, Itaú, Bradesco e outros</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => setSection('cards')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <CreditCard size={16} />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block">Cartões de Crédito</span>
                <span className="text-[11px] text-slate-400">{cards.length} cartões cadastrados</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => setSection('recurring')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Calendar size={16} />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block">Despesas Recorrentes</span>
                <span className="text-[11px] text-slate-400">{recurring.length} assinaturas e contas fixas</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => setSection('budgets')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Target size={16} />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block">Orçamentos por Categoria</span>
                <span className="text-[11px] text-slate-400">{budgets.length} tetos mensais definidos</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          <button
            onClick={() => setSection('categories')}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <Tags size={16} />
              </div>
              <div className="text-left">
                <span className="font-bold text-slate-800 block">Categorias Personalizadas</span>
                <span className="text-[11px] text-slate-400">{categories.length} categorias ativas</span>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Security & System Info */}
        <div className="p-4 rounded-3xl bg-slate-100/80 border border-slate-200/60 text-xs text-slate-600 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-slate-700">
            <ShieldCheck size={16} className="text-emerald-600" /> Segurança & Privacidade
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Seus dados financeiros são isolados e protegidos com criptografia. Arquitetura modular pronta para integração futura com Open Finance e bancos.
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // SUB-SECTION: CONTAS
  // -----------------------------------------------------------
  if (section === 'accounts') {
    return (
      <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <button onClick={() => setSection('menu')} className="p-1 rounded-xl bg-white text-slate-600">
            <X size={18} />
          </button>
          <h2 className="text-base font-bold text-slate-800">Gerenciar Contas Bancárias</h2>
        </div>

        {/* Form add account */}
        <form onSubmit={handleCreateAccount} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-800 block">Cadastrar Nova Conta</span>
          <input
            type="text"
            value={newAccName}
            onChange={(e) => setNewAccName(e.target.value)}
            placeholder="Nome da conta (ex: Nubank, Itaú Corrente)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={newAccInst}
              onChange={(e) => setNewAccInst(e.target.value)}
              placeholder="Instituição (ex: Nubank)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            />
            <input
              type="number"
              step="0.01"
              value={newAccBalance}
              onChange={(e) => setNewAccBalance(e.target.value)}
              placeholder="Saldo Inicial (R$)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Adicionar Conta
          </button>
        </form>

        {/* Accounts List */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-800 block">Suas Contas Ativas</span>
          <div className="divide-y divide-slate-100">
            {accounts.map((a) => (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{a.name}</span>
                  <span className="text-[10px] text-slate-400">{a.institution}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-800 mr-1">{fmtBRL(a.current_balance)}</span>
                  <button
                    onClick={() => onOpenImport?.(a.id)}
                    className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center gap-1 transition-colors active:scale-95"
                    title={`Importar extrato para ${a.name}`}
                  >
                    <UploadCloud size={11} /> Importar
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Remover conta ${a.name}?`)) {
                        await apiClient.deleteAccount(a.id);
                        notifyChange();
                      }
                    }}
                    className="text-slate-300 hover:text-rose-500 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // SUB-SECTION: CARTÕES DE CRÉDITO
  // -----------------------------------------------------------
  if (section === 'cards') {
    return (
      <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <button onClick={() => setSection('menu')} className="p-1 rounded-xl bg-white text-slate-600">
            <X size={18} />
          </button>
          <h2 className="text-base font-bold text-slate-800">Gerenciar Cartões de Crédito</h2>
        </div>

        {/* Form add card */}
        <form onSubmit={handleCreateCard} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-800 block">Novo Cartão de Crédito</span>
          <input
            type="text"
            value={newCardName}
            onChange={(e) => setNewCardName(e.target.value)}
            placeholder="Nome (ex: Cartão Nubank Ultravioleta)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              value={newCardLimit}
              onChange={(e) => setNewCardLimit(e.target.value)}
              placeholder="Limite Total (R$)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            />
            <input
              type="number"
              min="1"
              max="31"
              value={newCardDue}
              onChange={(e) => setNewCardDue(e.target.value)}
              placeholder="Dia do Vencimento"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Adicionar Cartão
          </button>
        </form>

        {/* Cards List */}
        <div className="space-y-3">
          {cards.map((c) => (
            <div key={c.id} className="p-4 rounded-3xl bg-slate-900 text-white space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{c.name}</span>
                <button
                  onClick={async () => {
                    if (confirm(`Remover cartão ${c.name}?`)) {
                      await apiClient.deleteCreditCard(c.id);
                      notifyChange();
                    }
                  }}
                  className="text-slate-400 hover:text-rose-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-400">Limite: {fmtBRL(c.credit_limit)}</span>
                <span className="text-purple-300 font-semibold">Vencimento: dia {c.due_day}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                <span className="text-slate-400">Fatura Atual: {fmtBRL(c.current_invoice)}</span>
                <span className="text-emerald-400 font-bold">Disponível: {fmtBRL(c.limit_available)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // SUB-SECTION: DESPESAS RECORRENTES
  // -----------------------------------------------------------
  if (section === 'recurring') {
    return (
      <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <button onClick={() => setSection('menu')} className="p-1 rounded-xl bg-white text-slate-600">
            <X size={18} />
          </button>
          <h2 className="text-base font-bold text-slate-800">Despesas Recorrentes & Assinaturas</h2>
        </div>

        {/* Form add recurring */}
        <form onSubmit={handleCreateRecurring} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-800 block">Nova Assinatura / Gasto Fixo</span>
          <input
            type="text"
            value={newRecDesc}
            onChange={(e) => setNewRecDesc(e.target.value)}
            placeholder="Nome (ex: Netflix, Internet Fibra, Academia)"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              step="0.01"
              value={newRecAmount}
              onChange={(e) => setNewRecAmount(e.target.value)}
              placeholder="Valor Mensal (R$)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            />
            <input
              type="number"
              min="1"
              max="31"
              value={newRecDueDay}
              onChange={(e) => setNewRecDueDay(e.target.value)}
              placeholder="Dia do Vencimento"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Adicionar Recorrência
          </button>
        </form>

        {/* Recurring List */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-slate-800 block">Assinaturas e Contas</span>
          <div className="divide-y divide-slate-100">
            {recurring.map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800 block">{r.description}</span>
                  <span className="text-[10px] text-slate-400">Todo dia {r.due_day} • {r.active ? 'Ativa' : 'Cancelada'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold text-slate-800">{fmtBRL(r.amount)}</span>
                  <button
                    onClick={async () => {
                      if (confirm(`Remover recorrência ${r.description}?`)) {
                        await apiClient.deleteRecurring(r.id);
                        notifyChange();
                      }
                    }}
                    className="text-slate-300 hover:text-rose-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // SUB-SECTION: ORÇAMENTOS
  // -----------------------------------------------------------
  if (section === 'budgets') {
    return (
      <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-150">
        <div className="flex items-center gap-2">
          <button onClick={() => setSection('menu')} className="p-1 rounded-xl bg-white text-slate-600">
            <X size={18} />
          </button>
          <h2 className="text-base font-bold text-slate-800">Orçamentos Mensais</h2>
        </div>

        {/* Form add / update budget */}
        <form onSubmit={handleSetBudget} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 block">
              {budgets.some(b => b.category_id === newBudgetCatId) ? 'Atualizar Teto de Gasto' : 'Definir Teto de Gasto'}
            </span>
            {budgets.some(b => b.category_id === newBudgetCatId) && (
              <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md">
                Já cadastrado
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newBudgetCatId}
              onChange={(e) => {
                const catId = e.target.value;
                setNewBudgetCatId(catId);
                const existing = budgets.find(b => b.category_id === catId);
                if (existing) {
                  setNewBudgetAmount(String(existing.budget_amount));
                }
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              {categories.filter(c => c.type === 'expense').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              step="10"
              value={newBudgetAmount}
              onChange={(e) => setNewBudgetAmount(e.target.value)}
              placeholder="Limite (R$)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <Check size={14} /> {budgets.some(b => b.category_id === newBudgetCatId) ? 'Atualizar Teto' : 'Salvar Orçamento'}
          </button>
        </form>

        {/* Budgets List */}
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 block">Tetos Definidos para este Mês</span>
            <span className="text-[10px] text-slate-400 font-medium">Toque no lápis para editar</span>
          </div>

          <div className="space-y-3">
            {budgets.map((b) => {
              const isEditing = editingBudgetId === b.id;

              return (
                <div
                  key={b.id}
                  className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-all ${
                    isEditing
                      ? 'bg-emerald-50/60 border-emerald-400 ring-2 ring-emerald-500/20 shadow-sm'
                      : 'bg-slate-50 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-slate-800">
                      <span>{b.category_icon}</span> {b.category_name}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-700">
                        {fmtBRL(b.spent_amount)} / <strong className="text-emerald-700">{fmtBRL(b.budget_amount)}</strong>
                      </span>

                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingBudgetId(b.id);
                              setEditingBudgetAmount(String(b.budget_amount));
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            title="Editar valor do teto"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBudget(b.id, b.category_name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                            title="Excluir teto"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="pt-1.5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
                        <span>Alterar teto de {b.category_name}:</span>
                        <span className="text-[10px] text-slate-400">Atual: {fmtBRL(b.budget_amount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                          <input
                            type="number"
                            step="10"
                            min="1"
                            value={editingBudgetAmount}
                            onChange={(e) => setEditingBudgetAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleUpdateBudget(b.id, editingBudgetAmount);
                              } else if (e.key === 'Escape') {
                                setEditingBudgetId(null);
                              }
                            }}
                            placeholder="Novo teto"
                            autoFocus
                            className="w-full pl-9 pr-3 py-2 rounded-xl border border-emerald-400 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUpdateBudget(b.id, editingBudgetAmount)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all"
                        >
                          <Check size={14} /> Salvar
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingBudgetId(null)}
                          className="px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-semibold text-xs transition-all"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            b.status === 'danger' ? 'bg-rose-500' : b.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, b.percentage_used)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{b.percentage_used}% utilizado</span>
                        <span className={`font-semibold ${b.status === 'danger' ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                          {b.status === 'danger' ? 'Limite estourado!' : `Restam ${fmtBRL(Math.max(0, b.remaining_amount))}`}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------
  // SUB-SECTION: CATEGORIAS
  // -----------------------------------------------------------
  return (
    <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-150">
      <div className="flex items-center gap-2">
        <button onClick={() => setSection('menu')} className="p-1 rounded-xl bg-white text-slate-600">
          <X size={18} />
        </button>
        <h2 className="text-base font-bold text-slate-800">Categorias Personalizadas</h2>
      </div>

      {/* Form add category */}
      <form onSubmit={handleCreateCategory} className="p-4 bg-white rounded-3xl border border-slate-100 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 block">Criar Nova Categoria</span>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={newCatIcon}
            onChange={(e) => setNewCatIcon(e.target.value)}
            placeholder="Emoji"
            className="w-full px-2 text-center py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            maxLength={3}
          />
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            placeholder="Nome (ex: Pet)"
            className="col-span-2 w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none"
            required
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNewCatType('expense')}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium ${
                newCatType === 'expense' ? 'bg-rose-100 text-rose-800 font-bold' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setNewCatType('income')}
              className={`px-3 py-1.5 text-xs rounded-xl font-medium ${
                newCatType === 'income' ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-100 text-slate-600'
              }`}
            >
              Receita
            </button>
          </div>
          <input
            type="color"
            value={newCatColor}
            onChange={(e) => setNewCatColor(e.target.value)}
            className="w-8 h-8 rounded-xl cursor-pointer border-0 bg-transparent"
          />
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs flex items-center justify-center gap-1.5"
        >
          <Plus size={14} /> Salvar Categoria
        </button>
      </form>

      {/* Categories List */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-3">
        <span className="text-xs font-bold text-slate-800 block">Todas as Categorias ({categories.length})</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {categories.map((c) => (
            <div key={c.id} className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2 truncate font-semibold text-slate-700">
                <span>{c.icon}</span>
                <span className="truncate">{c.name}</span>
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase ${
                c.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {c.type === 'income' ? 'REC' : 'DESP'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
