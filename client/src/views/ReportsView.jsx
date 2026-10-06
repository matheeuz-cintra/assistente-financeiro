import React, { useState, useEffect } from 'react';
import { 
  BarChart2, TrendingUp, TrendingDown, Download, FileSpreadsheet, 
  Lightbulb, AlertCircle, ArrowUpRight, ArrowDownRight, RefreshCw, CheckCircle2 
} from 'lucide-react';
import { apiClient } from '../api/client.js';

export function ReportsView({ hideValues }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await apiClient.getReports();
      setReport(data);
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

  const handleExportCSV = async () => {
    setDownloading(true);
    try {
      await apiClient.downloadCSV();
    } catch (err) {
      alert('Erro ao exportar CSV: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      await apiClient.downloadExcel();
    } catch (err) {
      alert('Erro ao exportar Excel: ' + err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
        <RefreshCw size={28} className="animate-spin text-emerald-600 mb-2" />
        <span className="text-xs font-medium">Gerando relatórios e análises...</span>
      </div>
    );
  }

  const { currentMonth, previousMonth, categoryExpenses, timeline, topExpenses, expensesByAccount, expensesByCard, insights } = report || {};

  const totalExpense = currentMonth?.expense || 0;
  const maxTimelineVal = timeline ? Math.max(...timeline.map((t) => Math.max(t.income, t.expense, 1))) : 1;

  return (
    <div className="flex-1 pb-24 px-4 pt-3 space-y-4 animate-in fade-in duration-200">
      {/* Title & Export Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Relatórios & Insights</h2>
          <p className="text-xs text-slate-400">Visão analítica completa das suas finanças</p>
        </div>
      </div>

      {/* Export Card */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-4 text-white shadow-md flex items-center justify-between">
        <div>
          <span className="text-xs font-bold block">Exportar Lançamentos</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Compatível com Excel, Google Planilhas</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExportCSV}
            disabled={downloading}
            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download size={13} /> CSV
          </button>
          <button
            onClick={handleExportExcel}
            disabled={downloading}
            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
        </div>
      </div>

      {/* 1. Smart Financial Insights (Section 19) */}
      {insights && insights.length > 0 && (
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <Lightbulb size={16} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">Inteligência Financeira IA</h3>
              <span className="text-[10px] text-slate-400">Insights baseados em seus dados reais</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {insights.map((ins, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-2xl text-xs flex items-start gap-2.5 border ${
                  ins.type === 'warning'
                    ? 'bg-amber-50/60 border-amber-200/60 text-amber-900'
                    : ins.type === 'success'
                    ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-900'
                    : 'bg-indigo-50/60 border-indigo-200/60 text-indigo-900'
                }`}
              >
                <div className="mt-0.5 font-bold">
                  {ins.type === 'warning' ? <AlertCircle size={14} className="text-amber-600" /> : <CheckCircle2 size={14} className="text-emerald-600" />}
                </div>
                <div>
                  <span className="font-bold block text-[11px]">{ins.title}</span>
                  <p className="text-[11px] leading-relaxed mt-0.5 opacity-90">{ins.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Month Comparison (Section 18) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800">Comparativo com Mês Anterior</h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">{currentMonth?.monthName}</span>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Receitas:</span>
                <span className="font-bold text-emerald-600">+{fmtBRL(currentMonth?.income)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Despesas:</span>
                <span className="font-bold text-rose-600">-{fmtBRL(currentMonth?.expense)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Resultado:</span>
                <span className={`font-bold ${currentMonth?.result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {fmtBRL(currentMonth?.result)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">Mês Anterior</span>
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Receitas:</span>
                <span className="font-bold text-emerald-600">+{fmtBRL(previousMonth?.income)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Despesas:</span>
                <span className="font-bold text-rose-600">-{fmtBRL(previousMonth?.expense)}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="font-bold text-slate-700">Resultado:</span>
                <span className={`font-bold ${previousMonth?.result >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {fmtBRL(previousMonth?.result)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Evolução Financeira (Últimos 6 meses) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800">Evolução Mensal</h3>
          <span className="text-[11px] text-slate-400">Histórico de receitas vs despesas</span>
        </div>

        <div className="flex items-end justify-between gap-2 pt-6 pb-2 h-44 px-2">
          {timeline && timeline.map((m, idx) => {
            const incomeHeight = Math.max(8, Math.round((m.income / maxTimelineVal) * 110));
            const expenseHeight = Math.max(8, Math.round((m.expense / maxTimelineVal) * 110));

            return (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="flex items-end gap-1 w-full justify-center">
                  {/* Income Bar */}
                  <div
                    title={`Receitas: R$ ${m.income}`}
                    className="w-2.5 rounded-t-md bg-emerald-500 hover:brightness-110 transition-all"
                    style={{ height: `${incomeHeight}px` }}
                  />
                  {/* Expense Bar */}
                  <div
                    title={`Despesas: R$ ${m.expense}`}
                    className="w-2.5 rounded-t-md bg-rose-400 hover:brightness-110 transition-all"
                    style={{ height: `${expenseHeight}px` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 font-semibold">{m.monthName}</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-center gap-4 text-[11px] font-medium text-slate-500 pt-2 border-t border-slate-100">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Receitas
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-rose-400" /> Despesas
          </span>
        </div>
      </div>

      {/* 4. Gastos por Categoria */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3.5">
        <h3 className="text-sm font-bold text-slate-800">Detalhamento por Categoria</h3>

        {categoryExpenses && categoryExpenses.length > 0 ? (
          <div className="space-y-3">
            {categoryExpenses.map((cat) => {
              const pct = totalExpense > 0 ? Math.round((cat.total / totalExpense) * 1000) / 10 : 0;
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <span>{cat.icon}</span> {cat.name}
                    </span>
                    <span className="font-bold text-slate-800">
                      {fmtBRL(cat.total)}{' '}
                      <span className="text-[10px] text-slate-400 font-normal">({pct}%)</span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: cat.color || '#10b981' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">Sem despesas registradas.</div>
        )}
      </div>

      {/* 5. Maiores Despesas do Mês (Top 5) */}
      {topExpenses && topExpenses.length > 0 && (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Maiores Despesas do Mês</h3>

          <div className="divide-y divide-slate-100">
            {topExpenses.map((tx, idx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="w-5 text-center font-extrabold text-slate-400 text-[11px]">
                    #{idx + 1}
                  </span>
                  <span className="text-base">{tx.category_icon || '🏷️'}</span>
                  <div>
                    <span className="font-bold text-slate-800 block truncate max-w-[170px]">
                      {tx.description}
                    </span>
                    <span className="text-[10px] text-slate-400 block">{tx.category_name}</span>
                  </div>
                </div>
                <span className="font-extrabold text-rose-600">
                  -{fmtBRL(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. Gastos por Conta e por Cartão */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 mb-2">Por Conta</h4>
          {expensesByAccount && expensesByAccount.length > 0 ? (
            <div className="space-y-2">
              {expensesByAccount.map((a, i) => (
                <div key={i} className="text-xs">
                  <span className="text-slate-500 block truncate text-[11px]">{a.name}</span>
                  <span className="font-bold text-slate-800">{fmtBRL(a.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">Nenhum gasto por conta</span>
          )}
        </div>

        <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-xs">
          <h4 className="text-xs font-bold text-slate-800 mb-2">Por Cartão</h4>
          {expensesByCard && expensesByCard.length > 0 ? (
            <div className="space-y-2">
              {expensesByCard.map((c, i) => (
                <div key={i} className="text-xs">
                  <span className="text-slate-500 block truncate text-[11px]">{c.name}</span>
                  <span className="font-bold text-slate-800">{fmtBRL(c.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <span className="text-[10px] text-slate-400">Nenhum gasto no cartão</span>
          )}
        </div>
      </div>
    </div>
  );
}
