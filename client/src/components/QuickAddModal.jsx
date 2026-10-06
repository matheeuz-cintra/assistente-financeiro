import React, { useState, useEffect } from 'react';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, Sparkles, Check, Mic } from 'lucide-react';
import { apiClient } from '../api/client.js';

export function QuickAddModal({ isOpen, onClose, onSuccess, onOpenVoiceAssistant }) {
  const [tab, setTab] = useState('expense'); // 'expense', 'income', 'transfer'
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [creditCardId, setCreditCardId] = useState('');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [creditCards, setCreditCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadResources();
      setAmount('');
      setDescription('');
      setError('');
    }
  }, [isOpen, tab]);

  const loadResources = async () => {
    try {
      const [cats, accs, cards] = await Promise.all([
        apiClient.getCategories(tab === 'income' ? 'income' : 'expense'),
        apiClient.getAccounts(),
        apiClient.getCreditCards()
      ]);
      setCategories(cats);
      setAccounts(accs);
      setCreditCards(cards);

      if (cats.length > 0 && !categoryId) setCategoryId(cats[0].id);
      if (accs.length > 0 && !accountId) setAccountId(accs[0].id);
      if (accs.length > 1 && !destinationAccountId) setDestinationAccountId(accs[1].id);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.'));
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Informe um valor válido maior que zero.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'transfer') {
        await apiClient.createTransfer({
          sourceAccountId: accountId,
          destinationAccountId,
          amount: parsedAmount,
          description: description || 'Transferência entre contas'
        });
      } else {
        await apiClient.createTransaction({
          type: tab,
          amount: parsedAmount,
          description: description || (tab === 'income' ? 'Receita' : 'Despesa'),
          categoryId: categoryId || null,
          accountId: creditCardId ? null : (accountId || null),
          creditCardId: creditCardId || null,
          paymentMethod: creditCardId ? 'credito' : 'pix'
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao registrar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Novo Lançamento</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* AI Voice & Text Shortcut */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenVoiceAssistant();
          }}
          className="mt-3.5 w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-indigo-500/10 border border-emerald-500/20 text-emerald-800 flex items-center justify-between hover:bg-emerald-50 transition-all text-xs font-semibold"
        >
          <span className="flex items-center gap-2">
            <Sparkles size={16} className="text-emerald-600 animate-pulse" />
            Preferir registrar falando ou escrevendo?
          </span>
          <span className="flex items-center gap-1 bg-emerald-600 text-white px-2 py-1 rounded-xl text-[11px]">
            <Mic size={12} /> Falar com IA
          </span>
        </button>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl mt-4">
          <button
            type="button"
            onClick={() => setTab('expense')}
            className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'expense' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <ArrowDownRight size={14} /> Despesa
          </button>
          <button
            type="button"
            onClick={() => setTab('income')}
            className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'income' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <ArrowUpRight size={14} /> Receita
          </button>
          <button
            type="button"
            onClick={() => setTab('transfer')}
            className={`py-2 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              tab === 'transfer' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-500'
            }`}
          >
            <ArrowLeftRight size={14} /> Transferir
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Big Amount Input */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex flex-col items-center">
            <span className="text-[11px] font-medium text-slate-400">VALOR</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-bold text-slate-500">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="w-48 text-3xl font-extrabold text-slate-800 text-center bg-transparent focus:outline-none placeholder-slate-300"
                autoFocus
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tab === 'expense' ? 'Ex: Almoço no buffet' : tab === 'income' ? 'Ex: Freelance' : 'Ex: Transferência reserva'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Category (if not transfer) */}
          {tab !== 'transfer' && (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Categoria</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Account / Card selection */}
          {tab === 'expense' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Conta (Débito/PIX)</label>
                <select
                  value={accountId}
                  disabled={!!creditCardId}
                  onChange={(e) => {
                    setAccountId(e.target.value);
                    if (e.target.value) setCreditCardId('');
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs bg-white ${
                    creditCardId ? 'opacity-40 border-slate-200' : 'border-slate-200'
                  }`}
                >
                  <option value="">Nenhuma</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Ou Cartão de Crédito</label>
                <select
                  value={creditCardId}
                  onChange={(e) => {
                    setCreditCardId(e.target.value);
                    if (e.target.value) setAccountId('');
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  <option value="">Não usar cartão</option>
                  {creditCards.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      💳 {cc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : tab === 'income' ? (
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Conta de Destino</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (Saldo: R$ {a.current_balance.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">De (Origem)</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Para (Destino)</label>
                <select
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs bg-white"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-semibold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={18} /> Salvar Lançamento
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
