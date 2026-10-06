import React, { useState } from 'react';
import { X, Copy, Trash2, Edit3, Calendar, Clock, CreditCard, Wallet, Tag, FileText, Check } from 'lucide-react';
import { apiClient } from '../api/client.js';

export function TransactionDetailModal({ transaction, onClose, onUpdated }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescription, setEditDescription] = useState(transaction?.description || '');
  const [editAmount, setEditAmount] = useState(transaction?.amount || 0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!transaction) return null;

  const isExpense = transaction.type === 'expense';
  const fmtBRL = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiClient.deleteTransaction(transaction.id);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      await apiClient.duplicateTransaction(transaction.id);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      await apiClient.updateTransaction(transaction.id, {
        description: editDescription,
        amount: parseFloat(editAmount)
      });
      setIsEditing(false);
      onUpdated();
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Detalhes do Lançamento
          </span>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Amount & Type Hero Card */}
        <div className="my-5 text-center flex flex-col items-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner mb-2"
            style={{ backgroundColor: `${transaction.category_color || '#64748b'}20` }}
          >
            {transaction.category_icon || '🏷️'}
          </div>

          {isEditing ? (
            <div className="flex flex-col items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                className="text-2xl font-extrabold text-center border-b-2 border-emerald-500 max-w-[180px] focus:outline-none"
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="text-sm font-semibold text-center border-b border-slate-300 max-w-[220px] focus:outline-none"
              />
            </div>
          ) : (
            <>
              <h2
                className={`text-3xl font-extrabold tracking-tight ${
                  isExpense ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {isExpense ? '-' : '+'} {fmtBRL(transaction.amount)}
              </h2>
              <p className="text-base font-bold text-slate-800 mt-0.5">{transaction.description}</p>
            </>
          )}

          <span
            className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              isExpense ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isExpense ? 'Despesa' : 'Receita'}
          </span>
        </div>

        {/* Details List */}
        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Tag size={14} /> Categoria
            </span>
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <span>{transaction.category_icon}</span>
              <span>{transaction.category_name || 'Geral'}</span>
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Calendar size={14} /> Data
            </span>
            <span className="font-semibold text-slate-700">{transaction.transaction_date}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <Clock size={14} /> Horário
            </span>
            <span className="font-semibold text-slate-700">{transaction.transaction_time || '12:00'}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              {transaction.credit_card_name ? <CreditCard size={14} /> : <Wallet size={14} />}
              {transaction.credit_card_name ? 'Cartão de Crédito' : 'Conta Bancária'}
            </span>
            <span className="font-semibold text-slate-700">
              {transaction.credit_card_name || transaction.account_name || 'Não informado'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-2">
              <CreditCard size={14} /> Forma de Pagamento
            </span>
            <span className="font-semibold text-slate-700 uppercase">
              {transaction.payment_method || 'nao_informado'}
            </span>
          </div>

          {transaction.notes && (
            <div className="pt-2 border-t border-slate-200/60">
              <span className="text-slate-400 flex items-center gap-1.5 mb-1">
                <FileText size={14} /> Observações:
              </span>
              <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-100">{transaction.notes}</p>
            </div>
          )}
        </div>

        {/* Delete Confirmation Alert */}
        {confirmDelete && (
          <div className="mt-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-center animate-in fade-in">
            <p className="text-xs font-bold text-rose-900">
              Tem certeza que deseja excluir esse lançamento de {fmtBRL(transaction.amount)}?
            </p>
            <p className="text-[11px] text-rose-700 mt-0.5">O saldo das suas contas será recalculado automaticamente.</p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-1.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-1.5 rounded-xl bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700"
              >
                {loading ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        )}

        {/* Actions: Edit, Duplicate, Delete */}
        {!confirmDelete && (
          <div className="grid grid-cols-3 gap-2 mt-5">
            {isEditing ? (
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="col-span-3 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <Check size={16} /> Salvar Alterações
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Edit3 size={15} /> Editar
                </button>
                <button
                  onClick={handleDuplicate}
                  disabled={loading}
                  className="py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Copy size={15} /> Duplicar
                </button>
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 size={15} /> Excluir
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
