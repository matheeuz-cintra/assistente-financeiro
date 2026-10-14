import React, { useState, useEffect } from 'react';
import { 
  Calendar, X, Plus, Check, Ban, Trash2, AlertTriangle, 
  Clock, CheckCircle2, Wallet, ArrowRight, ShieldAlert, Sparkles, Filter
} from 'lucide-react';
import { apiClient } from '../api/client.js';

export function ScheduledPaymentsModal({ isOpen, onClose, onDataChanged }) {
  const [payments, setPayments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending'); // 'pending', 'history', 'new'
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // New payment form
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Set default due date to tomorrow or today
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      setDueDate(tmrw.toISOString().slice(0, 10));
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [payList, accList, catList] = await Promise.all([
        apiClient.getScheduledPayments(),
        apiClient.getAccounts(),
        apiClient.getCategories()
      ]);
      setPayments(payList);
      setAccounts(accList);
      setCategories(catList);

      if (accList.length > 0 && !accountId) {
        setAccountId(accList[0].id);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de pagamentos agendados:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fmtBRL = (val) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDateBR = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return isoDate;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!description.trim()) {
      setFormError('Informe a descrição do pagamento (ex: Aluguel, Luz, Internet).');
      return;
    }

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    if (!accountId) {
      setFormError('A seleção da conta bancária é OBRIGATÓRIA.');
      return;
    }

    if (!dueDate) {
      setFormError('Informe a data de vencimento.');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.createScheduledPayment({
        description: description.trim(),
        amount: numAmount,
        accountId,
        dueDate,
        categoryId: categoryId || null,
        notes: notes.trim() || null
      });

      alert('📅 Pagamento agendado com sucesso! Você receberá uma notificação no app e um e-mail de confirmação.');
      setDescription('');
      setAmount('');
      setNotes('');
      setTab('pending');
      loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      setFormError(err.message || 'Erro ao agendar pagamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async (item) => {
    const accName = item.account_name || 'sua conta';
    if (!confirm(`Deseja confirmar o pagamento de ${fmtBRL(item.amount)} (${item.description})?\n\nO valor será registrado como despesa e debitado da conta ${accName}.`)) {
      return;
    }

    setActionLoadingId(item.id);
    try {
      await apiClient.confirmScheduledPayment(item.id);
      alert(`✅ Pagamento confirmado com sucesso! Saldo debitado de ${accName}.`);
      loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || 'Erro ao confirmar pagamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (item) => {
    if (!confirm(`Deseja realmente cancelar o agendamento de ${fmtBRL(item.amount)} (${item.description})?\n\nO agendamento será cancelado e NENHUM valor será debitado da sua conta.`)) {
      return;
    }

    setActionLoadingId(item.id);
    try {
      await apiClient.cancelScheduledPayment(item.id, 'Cancelado pelo usuário');
      alert('🚫 Agendamento cancelado. Nenhum valor foi debitado.');
      loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || 'Erro ao cancelar agendamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Excluir permanentemente o registro de agendamento de "${item.description}"?`)) {
      return;
    }

    try {
      await apiClient.deleteScheduledPayment(item.id);
      loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || 'Erro ao excluir agendamento.');
    }
  };

  const pendingPayments = payments.filter((p) => p.status === 'pending');
  const historyPayments = payments.filter((p) => p.status !== 'pending');

  const totalPendingAmount = pendingPayments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  const dueTodayCount = pendingPayments.filter((p) => p.isDueToday).length;
  const overdueCount = pendingPayments.filter((p) => p.isOverdue).length;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in notranslate" translate="no">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shadow-inner">
              <Calendar size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                <span>Pagamentos Agendados</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Contas a Pagar
                </span>
              </h2>
              <span className="text-xs text-slate-400">Lembretes automáticos com controle 100% seu</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-4 pt-3 pb-2 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => setTab('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'pending'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Pendentes</span>
              {pendingPayments.length > 0 && (
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  dueTodayCount > 0 ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-700 text-slate-200'
                }`}>
                  {pendingPayments.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTab('history')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                tab === 'history'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Histórico</span>
              {historyPayments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-slate-700 text-slate-300">
                  {historyPayments.length}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setTab('new')}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
              tab === 'new'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-sm'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            <Plus size={15} />
            <span>Agendar Conta</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* TAB 1: PENDING PAYMENTS */}
          {tab === 'pending' && (
            <div className="space-y-3.5">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 font-medium block">Total Pendente</span>
                  <span className="text-lg font-extrabold text-white block mt-0.5">
                    {fmtBRL(totalPendingAmount)}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {pendingPayments.length} conta{pendingPayments.length !== 1 ? 's' : ''} a pagar
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/60">
                  <span className="text-[11px] text-slate-400 font-medium block">Atenção</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {dueTodayCount > 0 ? (
                      <span className="text-sm font-extrabold text-rose-400 flex items-center gap-1">
                        🔴 {dueTodayCount} vence{dueTodayCount > 1 ? 'm' : ''} hoje!
                      </span>
                    ) : overdueCount > 0 ? (
                      <span className="text-sm font-extrabold text-amber-400 flex items-center gap-1">
                        ⚠️ {overdueCount} vencida{overdueCount > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="text-sm font-extrabold text-emerald-400 flex items-center gap-1">
                        ✅ Tudo em dia
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Não debitamos sem sua confirmação
                  </span>
                </div>
              </div>

              {/* Informative Rule Badge */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2.5 leading-relaxed">
                <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong>Regra de Segurança:</strong> Na data marcada, o valor <strong>NÃO</strong> é debitado sozinho. Você receberá notificações para decidir se já pagou ou quer cancelar.
                </div>
              </div>

              {/* List */}
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span>Carregando pagamentos agendados...</span>
                </div>
              ) : pendingPayments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
                    <Calendar size={24} />
                  </div>
                  <p className="text-sm font-semibold text-slate-300">Nenhum pagamento pendente</p>
                  <p className="text-xs text-slate-500 max-w-[280px] mx-auto">
                    Cadastre suas contas de água, luz, aluguel ou faturas para receber lembretes com 7 dias, 3 dias e na data de vencimento.
                  </p>
                  <button
                    type="button"
                    onClick={() => setTab('new')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm"
                  >
                    + Agendar Meu Primeiro Pagamento
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingPayments.map((item) => {
                    const daysDiff = item.daysDiff;
                    const isToday = item.isDueToday;
                    const isOverdue = item.isOverdue;

                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-3xl border transition-all ${
                          isToday
                            ? 'bg-slate-800 border-rose-500 shadow-md shadow-rose-950/20'
                            : isOverdue
                            ? 'bg-slate-800/90 border-amber-500/50'
                            : 'bg-slate-800/60 border-slate-700/60'
                        }`}
                      >
                        {/* Header of Item */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-inner shrink-0"
                              style={{ backgroundColor: `${item.category_color || '#64748b'}25` }}
                            >
                              {item.category_icon || '📅'}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white block leading-tight">
                                {item.description}
                              </h4>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Conta: <strong className="text-slate-200">{item.account_name}</strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-extrabold text-rose-400 block">
                              {fmtBRL(item.amount)}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Vence {formatDateBR(item.due_date)}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="mt-3 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            {isToday ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                                🔔 VENCE HOJE — Já pagou?
                              </span>
                            ) : isOverdue ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                ⚠️ Vencido há {Math.abs(daysDiff)} dia{Math.abs(daysDiff) > 1 ? 's' : ''}
                              </span>
                            ) : daysDiff === 1 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                ⏳ Vence amanhã
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                                ⏳ Faltam {daysDiff} dias
                              </span>
                            )}
                          </div>

                          {item.notes && (
                            <span className="text-[11px] text-slate-400 italic truncate max-w-[150px]">
                              {item.notes}
                            </span>
                          )}
                        </div>

                        {/* Action Buttons: Confirm or Cancel at any time */}
                        <div className="mt-3.5 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={actionLoadingId === item.id}
                              onClick={() => handleConfirm(item)}
                              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                              title="Registrar pagamento como despesa e debitar saldo"
                            >
                              <Check size={14} />
                              <span>Confirmar Pagamento</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionLoadingId === item.id}
                              onClick={() => handleCancel(item)}
                              className="px-3 py-2 rounded-xl bg-slate-700/80 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-600/50 hover:border-rose-500/40 disabled:opacity-50"
                              title="Cancelar agendamento sem debitar da conta"
                            >
                              <Ban size={14} />
                              <span>Cancelar</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-2 text-slate-500 hover:text-rose-400 transition-colors rounded-lg hover:bg-slate-700/40"
                            title="Excluir agendamento"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: HISTORY (PAID / CANCELLED) */}
          {tab === 'history' && (
            <div className="space-y-3">
              {historyPayments.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Nenhum pagamento concluído ou cancelado no histórico ainda.
                </div>
              ) : (
                historyPayments.map((item) => {
                  const isPaid = item.status === 'paid';
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-slate-800/40 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isPaid ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-white block truncate">{item.description}</span>
                          <span className="text-[10px] text-slate-400 block">
                            Conta: {item.account_name} • {isPaid ? `Pago em ${formatDateBR(item.paid_date)}` : 'Cancelado sem débito'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`font-bold block ${isPaid ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                          {fmtBRL(item.amount)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="text-[10px] text-slate-500 hover:text-rose-400 mt-1"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: CREATE NEW SCHEDULED PAYMENT */}
          {tab === 'new' && (
            <form onSubmit={handleCreate} className="space-y-3.5">
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Informative cadence banner */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 text-xs space-y-1.5">
                <span className="font-bold flex items-center gap-1.5 text-emerald-300">
                  <Sparkles size={14} /> Notificações automáticas incluídas:
                </span>
                <ul className="list-disc list-inside text-[11px] text-emerald-100/80 space-y-0.5">
                  <li>Confirmação imediata no app e no seu e-mail cadastrado.</li>
                  <li>Lembrete de alerta quando faltar <strong>7 dias</strong> para o vencimento.</li>
                  <li>Lembrete de alerta quando faltar <strong>3 dias</strong> para o vencimento.</li>
                  <li>Pergunta de confirmação no <strong>dia do vencimento</strong> (sem débito automático).</li>
                </ul>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Descrição do Pagamento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguel, Parcela do Carro, Conta de Luz"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Valor a Pagar (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-bold placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* MANDATORY Account Selection */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                    <Wallet size={13} /> Conta Bancária de Pagamento (OBRIGATÓRIO) *
                  </label>
                  <span className="text-[10px] text-slate-400">De onde sairá o dinheiro</span>
                </div>
                <select
                  required
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-slate-800 border-2 border-amber-500/60 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-hidden focus:border-emerald-500 transition-colors"
                >
                  <option value="" disabled>-- Selecione a Conta Bancária --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution}) • Saldo: {fmtBRL(acc.current_balance)}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 block mt-1">
                  O valor só será debitado do saldo quando você confirmar a realização do pagamento.
                </span>
              </div>

              {/* Due Date */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Data de Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Categoria (Opcional)
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-hidden focus:border-emerald-500 transition-colors"
                >
                  <option value="">Sem categoria específica</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.icon} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">
                  Observações (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pagar via Pix ou boleto até 16h"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs placeholder:text-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTab('pending')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold transition-all shadow-md shadow-emerald-950/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>{submitting ? 'Agendando...' : 'Salvar Agendamento'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
