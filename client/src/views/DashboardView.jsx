import React, { useState, useEffect } from 'react';
import { 
  ArrowDownRight, ArrowUpRight, ArrowLeftRight, TrendingUp, 
  CreditCard, Calendar, AlertCircle, ChevronRight, Mic, Sparkles, RefreshCw
} from 'lucide-react';
import { apiClient } from '../api/client.js';

export function DashboardView({ 
  hideValues, 
  onOpenQuickAdd, 
  onOpenAssistant, 
  onSelectTransaction, 
  onNavigateTab 
}) {
  const [data, setData] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const { balance, categories, recentTransactions, upcomingBills, creditCards } = data || {};

  return (
    <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-200">
      {/* 1. Main Balance Hero Card */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-5 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">Saldo Total Disponível</span>
          <button 
            onClick={handleRefresh}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Atualizar dados"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        <h2 className="text-3xl font-extrabold tracking-tight mt-1 mb-4 text-white">
          {fmtBRL(balance?.total)}
        </h2>

        {/* Month Summary Grid */}
        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/60">
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Receitas</span>
            <span className="text-xs font-bold text-emerald-400 block mt-0.5 truncate">
              +{fmtBRL(balance?.monthIncome)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Despesas</span>
            <span className="text-xs font-bold text-rose-400 block mt-0.5 truncate">
              -{fmtBRL(balance?.monthExpense)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-medium block">Resultado</span>
            <span className={`text-xs font-bold block mt-0.5 truncate ${
              (balance?.monthResult || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {(balance?.monthResult || 0) >= 0 ? '+' : ''}{fmtBRL(balance?.monthResult)}
            </span>
          </div>
        </div>
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
          onClick={() => onNavigateTab('reports')}
          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-xs flex flex-col items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-1.5">
            <TrendingUp size={18} />
          </div>
          <span className="text-[11px] font-semibold text-slate-700">Relatórios</span>
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
