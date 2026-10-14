import React, { useState, useEffect } from 'react';
import { 
  Bell, X, Check, CheckCheck, Trash2, Calendar, AlertTriangle, 
  CheckCircle2, Clock, Ban, ArrowRight, ExternalLink
} from 'lucide-react';
import { apiClient } from '../api/client.js';

export function NotificationsModal({ isOpen, onClose, onDataChanged, onOpenScheduledPayments }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const list = await apiClient.getNotifications(50);
      setNotifications(list);
    } catch (err) {
      console.error('Erro ao carregar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleMarkAsRead = async (id) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: 1 } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await apiClient.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await apiClient.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmPayment = async (referenceId, notificationId) => {
    if (!referenceId) return;
    if (!confirm('Deseja confirmar este pagamento agora? O valor será registrado como despesa e debitado do saldo da conta bancária.')) {
      return;
    }
    setActionLoadingId(notificationId);
    try {
      await apiClient.confirmScheduledPayment(referenceId);
      await apiClient.markNotificationRead(notificationId);
      alert('✅ Pagamento confirmado com sucesso! O saldo da conta foi atualizado.');
      loadNotifications();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || 'Erro ao confirmar pagamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelPayment = async (referenceId, notificationId) => {
    if (!referenceId) return;
    if (!confirm('Deseja cancelar este agendamento de pagamento? O agendamento será cancelado e NENHUM valor será debitado da sua conta.')) {
      return;
    }
    setActionLoadingId(notificationId);
    try {
      await apiClient.cancelScheduledPayment(referenceId, 'Cancelado via notificação');
      await apiClient.markNotificationRead(notificationId);
      alert('🚫 Pagamento agendado cancelado. Nenhum valor foi debitado.');
      loadNotifications();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      alert(err.message || 'Erro ao cancelar pagamento.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const unreadCount = notifications.filter((n) => n.read === 0).length;

  const getIconForType = (type) => {
    switch (type) {
      case 'payment_due_today':
        return <AlertTriangle size={18} className="text-amber-400 animate-pulse" />;
      case 'payment_reminder_3':
        return <Clock size={18} className="text-amber-400" />;
      case 'payment_reminder_7':
        return <Calendar size={18} className="text-sky-400" />;
      case 'payment_confirmed':
        return <CheckCircle2 size={18} className="text-emerald-400" />;
      case 'payment_cancelled':
        return <Ban size={18} className="text-rose-400" />;
      case 'payment_created':
        return <Calendar size={18} className="text-emerald-400" />;
      default:
        return <Bell size={18} className="text-slate-400" />;
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in notranslate" translate="no">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Bell size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Notificações</h2>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                    {unreadCount} nova{unreadCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400">Avisos e lembretes de pagamentos</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="px-2.5 py-1 text-[11px] font-semibold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                title="Marcar todas como lidas"
              >
                Ler todas
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span>Carregando notificações...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto mb-2">
                <Bell size={24} />
              </div>
              <p className="text-sm font-semibold text-slate-300">Nenhuma notificação no momento</p>
              <p className="text-xs text-slate-500 max-w-[260px] mx-auto">
                Quando você agendar pagamentos ou tiver contas a vencer, avisaremos você aqui e por e-mail!
              </p>
            </div>
          ) : (
            notifications.map((n) => {
              const isUnread = n.read === 0;
              const isDueOrReminder = 
                n.type === 'payment_due_today' || 
                n.type === 'payment_reminder_3' || 
                n.type === 'payment_reminder_7';

              return (
                <div
                  key={n.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isUnread
                      ? 'bg-slate-800/90 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 mt-0.5 border border-slate-700/50">
                      {getIconForType(n.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-xs font-bold leading-tight ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                          {n.title}
                        </h4>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {formatDate(n.created_at)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {n.message}
                      </p>

                      {/* Interactive Buttons for Scheduled Payment Notifications */}
                      {isDueOrReminder && n.reference_id && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={actionLoadingId === n.id}
                            onClick={() => handleConfirmPayment(n.reference_id, n.id)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
                          >
                            <Check size={13} />
                            <span>Confirmar Pagamento</span>
                          </button>

                          <button
                            type="button"
                            disabled={actionLoadingId === n.id}
                            onClick={() => handleCancelPayment(n.reference_id, n.id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50 border border-slate-600/50 hover:border-rose-500/40"
                          >
                            <Ban size={13} />
                            <span>Cancelar</span>
                          </button>
                        </div>
                      )}

                      {/* Footer Actions */}
                      <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        {isUnread ? (
                          <button
                            type="button"
                            onClick={() => handleMarkAsRead(n.id)}
                            className="text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <Check size={12} /> Marcar como lida
                          </button>
                        ) : (
                          <span className="flex items-center gap-1 text-slate-500">
                            <CheckCheck size={12} /> Lida
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDeleteNotification(n.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="Excluir notificação"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut to Scheduled Payments Manager */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">Quer agendar uma nova conta?</span>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenScheduledPayments) onOpenScheduledPayments();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-all border border-slate-700/60"
          >
            <span>Ver Agendamentos</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
