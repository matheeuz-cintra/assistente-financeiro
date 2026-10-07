import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowDownRight, ArrowUpRight, ArrowLeftRight, TrendingUp, 
  CreditCard, Calendar, AlertCircle, ChevronRight, ChevronLeft, Mic, Sparkles, RefreshCw, Wallet,
  FileSpreadsheet, UploadCloud
} from 'lucide-react';
import { apiClient } from '../api/client.js';

export function DashboardView({ 
  hideValues, 
  onOpenQuickAdd, 
  onOpenImport,
  onOpenAssistant, 
  onSelectTransaction, 
  onNavigateTab 
}) {
  const [data, setData] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const scrollContainerRef = useRef(null);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [dash, bList] = await Promise.all([
        apiClient.getDashboard(),
        apiClient.getBudgets()
      ]);
      setData(dash);
      setBudgets(bList);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, clientWidth } = scrollContainerRef.current;
    if (clientWidth > 0) {
      const newIndex = Math.round(scrollLeft / clientWidth);
      if (newIndex !== activeCardIndex && newIndex >= 0) {
        setActiveCardIndex(newIndex);
      }
    }
  };

  const scrollToIndex = (index) => {
    if (!scrollContainerRef.current) return;
    const width = scrollContainerRef.current.clientWidth;
    scrollContainerRef.current.scrollTo({
      left: index * width,
      behavior: 'smooth'
    });
    setActiveCardIndex(index);
  };

  const fmtBRL = (val) => {
    if (hideValues) return '••••••';
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
        <RefreshCw size={28} className="animate-spin text-emerald-600 mb-2" />
        <span className="text-xs font-medium">Carregando suas finanças...</span>
      </div>
    );
  }

  const { balance, categories, recentTransactions, upcomingBills, creditCards, accounts } = data || {};

  // Build the list of cards: individual bank accounts first, followed by consolidated total
  const accountCards = [];
  if (accounts && accounts.length > 0) {
    accounts.forEach((acc) => {
      const nameLower = (acc.name || '').toLowerCase();
      const instLower = (acc.institution || '').toLowerCase();
      const isNu = instLower.includes('nubank') || nameLower.includes('nubank');
      const isCash = acc.type === 'cash' || nameLower.includes('dinheiro') || instLower.includes('dinheiro');
      const isInter = instLower.includes('inter') || nameLower.includes('inter');

      accountCards.push({
        id: acc.id,
        isTotal: false,
        name: acc.name,
        institution: acc.institution,
        type: acc.type,
        balance: acc.current_balance,
        monthIncome: acc.monthIncome || 0,
        monthExpense: acc.monthExpense || 0,
        monthResult: acc.monthResult || 0,
        badge: acc.institution || (acc.type === 'cash' ? 'Dinheiro' : 'Conta'),
        badgeIcon: isNu ? '🟣' : isCash ? '💵' : isInter ? '🟠' : '💳',
        glowColor: isNu ? 'bg-purple-500/25' : isCash ? 'bg-emerald-500/25' : isInter ? 'bg-orange-500/25' : 'bg-emerald-500/20'
      });
    });
  }

  // Also include the consolidated total card
  accountCards.push({
    id: 'total-consolidated',
    isTotal: true,
    name: 'Saldo Geral Consolidado',
    institution: 'Todas as Contas',
    type: 'all',
    balance: balance?.total || 0,
    monthIncome: balance?.monthIncome || 0,
    monthExpense: balance?.monthExpense || 0,
    monthResult: balance?.monthResult || 0,
    badge: 'Visão Geral',
    badgeIcon: '🌐',
    glowColor: 'bg-teal-500/25'
  });

  return (
    <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-200">
      {/* 1. Main Balance Multi-Account Swipeable Carousel */}
      <div className="space-y-2">
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none rounded-3xl"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {accountCards.map((card, idx) => (
            <div
              key={card.id || idx}
              className="w-full shrink-0 snap-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[195px]"
            >
              {/* Subtle decorative glow */}
              <div className={`absolute -top-12 -right-12 w-40 h-40 ${card.glowColor || 'bg-emerald-500/20'} rounded-full blur-2xl pointer-events-none`} />

              {/* Card Header */}
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-200 border border-white/10 flex items-center gap-1">
                      <span>{card.badgeIcon}</span> {card.badge}
                    </span>
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {card.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {accountCards.length > 1 && (
                      <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 rounded-md bg-black/30 mr-1">
                        {idx + 1}/{accountCards.length}
                      </span>
                    )}

                    {accountCards.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => scrollToIndex(Math.max(0, idx - 1))}
                          disabled={idx === 0}
                          className="text-slate-400 hover:text-white disabled:opacity-20 p-1 transition-colors"
                          title="Conta anterior"
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollToIndex(Math.min(accountCards.length - 1, idx + 1))}
                          disabled={idx === accountCards.length - 1}
                          className="text-slate-400 hover:text-white disabled:opacity-20 p-1 transition-colors"
                          title="Próxima conta"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </>
                    )}

                    <button 
                      type="button"
                      onClick={handleRefresh}
                      className="text-slate-400 hover:text-white transition-colors p-1 ml-0.5"
                      title="Atualizar dados"
                    >
                      <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {/* Balance Amount & Extrato button */}
                <div className="mt-2.5 mb-3 flex items-end justify-between">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium block">
                      {card.isTotal ? 'Saldo Total Disponível' : `Saldo Disponível em ${card.name}`}
                    </span>
                    <h2 className="text-3xl font-extrabold tracking-tight text-white mt-0.5">
                      {fmtBRL(card.balance)}
                    </h2>
                  </div>
                  {!card.isTotal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenImport?.(card.id);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 border border-white/15 transition-all shadow-xs"
                      title={`Importar extrato para ${card.name}`}
                    >
                      <UploadCloud size={13} />
                      <span>Extrato</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Month Summary Grid */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Receitas</span>
                  <span className="text-xs font-bold text-emerald-400 block mt-0.5 truncate">
                    +{fmtBRL(card.monthIncome)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Despesas</span>
                  <span className="text-xs font-bold text-rose-400 block mt-0.5 truncate">
                    -{fmtBRL(card.monthExpense)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-medium block">Resultado</span>
                  <span className={`text-xs font-bold block mt-0.5 truncate ${
                    (card.monthResult || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    {(card.monthResult || 0) >= 0 ? '+' : ''}{fmtBRL(card.monthResult)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Pagination Dots */}
        {accountCards.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {accountCards.map((c, i) => (
              <button
                key={c.id || i}
                type="button"
                onClick={() => scrollToIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeCardIndex === i 
                    ? 'w-6 bg-emerald-500' 
                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                }`}
                title={`Ver ${c.name}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* 2. Natural Voice & Text Assistant Banner */}
      <div 
        onClick={onOpenAssistant}
        className="cursor-pointer bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 rounded-2xl p-3.5 text-white shadow-md shadow-emerald-700/20 flex items-center justify-between hover:scale-[1.01] active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shadow-inner">
            <Mic size={20} className="text-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-xs font-bold flex items-center gap-1.5">
              <span>Assistente Financeiro IA</span>
              <span className="bg-white/25 text-[10px] px-1.5 py-0.2 rounded-md font-semibold">Voz ou Texto</span>
            </h3>
            <p className="text-[11px] text-emerald-100 mt-0.5">
              "Gastei 35 no almoço" • "Quanto gastei este mês?"
            </p>
          </div>
        </div>
        <ChevronRight size={18} className="text-emerald-200" />
      </div>

      {/* 3. Quick Action Buttons */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={onOpenQuickAdd}
          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-1.5">
            <ArrowDownRight size={18} />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Despesa</span>
        </button>

        <button
          onClick={onOpenQuickAdd}
          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
            <ArrowUpRight size={18} />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Receita</span>
        </button>

        <button
          onClick={onOpenQuickAdd}
          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1.5">
            <ArrowLeftRight size={18} />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Transferir</span>
        </button>

        <button
          onClick={() => onOpenImport?.()}
          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-600 flex items-center justify-center mb-1.5">
            <FileSpreadsheet size={18} />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Importar</span>
        </button>
      </div>

      {/* Welcome / Onboarding Card for New Accounts */}
      {(!recentTransactions || recentTransactions.length === 0) && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/60 rounded-3xl p-5 text-slate-800 shadow-xs space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">✨</span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Sua conta está pronta!</h3>
              <p className="text-xs text-slate-600">Veja como é fácil registrar seus lançamentos sem planilhas:</p>
            </div>
          </div>
          <div className="space-y-1.5 text-xs text-slate-700 bg-white/80 p-3 rounded-2xl border border-emerald-100">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">1.</span>
              <span>Abra o <strong>Assistente IA</strong> e diga ou digite: <em>"Gastei 35 no almoço"</em></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">2.</span>
              <span>Ou use os botões rápidos de <strong>Despesa</strong> e <strong>Receita</strong> acima.</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold">3.</span>
              <span>Seus cartões, orçamentos e gráficos se atualizam automaticamente!</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Gastos por Categoria (Visual Breakdown) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Gastos por Categoria</h3>
            <span className="text-[11px] text-slate-400">Distribuição no mês atual</span>
          </div>
          <button 
            onClick={() => onNavigateTab('reports')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            Ver mais <ChevronRight size={14} />
          </button>
        </div>

        {categories && categories.length > 0 ? (
          <div className="space-y-3">
            {categories.slice(0, 4).map((cat) => (
              <div key={cat.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <span>{cat.icon}</span>
                    <span className="font-semibold">{cat.name}</span>
                  </span>
                  <span className="font-bold text-slate-800">
                    {fmtBRL(cat.total)}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">({cat.percentage}%)</span>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, cat.percentage)}%`,
                      backgroundColor: cat.color || '#10b981'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            Nenhuma despesa registrada neste mês ainda.
          </div>
        )}
      </div>

      {/* 5. Orçamentos Mensais com Alerta Visual */}
      {budgets && budgets.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Orçamento Mensal</h3>
              <span className="text-[11px] text-slate-400">Acompanhamento dos limites</span>
            </div>
            <button 
              onClick={() => onNavigateTab('more')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center"
            >
              Gerenciar <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3.5">
            {budgets.slice(0, 3).map((b) => (
              <div key={b.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{b.category_icon}</span> {b.category_name}
                  </span>
                  <span className="font-bold text-slate-700">
                    {fmtBRL(b.spent_amount)} / {fmtBRL(b.budget_amount)}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      b.status === 'danger'
                        ? 'bg-rose-500'
                        : b.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, b.percentage_used)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className={`font-semibold ${
                    b.status === 'danger' ? 'text-rose-600' : b.status === 'warning' ? 'text-amber-600' : 'text-slate-500'
                  }`}>
                    {b.percentage_used}% utilizado
                  </span>
                  <span className="text-slate-400">
                    Restam: {fmtBRL(Math.max(0, b.remaining_amount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Cartões de Crédito */}
      {creditCards && creditCards.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Cartões de Crédito</h3>
              <span className="text-[11px] text-slate-400">Fatura e limites disponíveis</span>
            </div>
            <button 
              onClick={() => onNavigateTab('more')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center"
            >
              Ver todos <ChevronRight size={14} />
            </button>
          </div>

          <div className="space-y-3">
            {creditCards.map((card) => {
              const usedPercent = card.credit_limit > 0 ? Math.round((card.limit_used / card.credit_limit) * 100) : 0;
              return (
                <div key={card.id} className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <CreditCard size={15} className="text-purple-400" /> {card.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Vence dia {card.due_day}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between pt-1">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Fatura Atual</span>
                      <span className="text-base font-extrabold text-white">
                        {fmtBRL(card.current_invoice)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Disponível</span>
                      <span className="text-xs font-semibold text-emerald-400">
                        {fmtBRL(card.limit_available)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, usedPercent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Próximos Pagamentos / Recorrências */}
      {upcomingBills && upcomingBills.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Próximos Pagamentos</h3>
              <span className="text-[11px] text-slate-400">Assinaturas e contas agendadas</span>
            </div>
            <Calendar size={16} className="text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {upcomingBills.slice(0, 3).map((bill) => (
              <div key={bill.id} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{bill.category_icon || '📅'}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{bill.description}</span>
                    <span className="text-[10px] text-slate-400">Vencimento todo dia {bill.due_day}</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {fmtBRL(bill.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8. Últimos Lançamentos (Formatted List) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Últimos Lançamentos</h3>
            <span className="text-[11px] text-slate-400">Toque para ver detalhes</span>
          </div>
          <button 
            onClick={() => onNavigateTab('history')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            Ver histórico <ChevronRight size={14} />
          </button>
        </div>

        {recentTransactions && recentTransactions.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => {
              const isExpense = tx.type === 'expense';
              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-xl px-2 -mx-2 transition-colors active:scale-98"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner"
                      style={{ backgroundColor: `${tx.category_color || '#64748b'}18` }}
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
                      {tx.transaction_date?.slice(5)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            Nenhum lançamento recente. Use o assistente ou o botão "+" para registrar!
          </div>
        )}
      </div>
    </div>
  );
}
