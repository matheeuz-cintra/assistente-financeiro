import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, SlidersHorizontal, Sparkles, Smartphone, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { apiClient } from '../api/client.js';

export function Header({ hideValues, onToggleHideValues, onOpenMore, onOpenInstall, onOpenNotifications, unreadCount = 0 }) {
  const { user } = useAuth();
  const [isStandalone, setIsStandalone] = useState(false);
  const [localUnread, setLocalUnread] = useState(unreadCount);

  useEffect(() => {
    setLocalUnread(unreadCount);
  }, [unreadCount]);

  useEffect(() => {
    // Quick poll unread count
    const checkCount = async () => {
      try {
        const res = await apiClient.getUnreadNotificationsCount();
        setLocalUnread(res?.count || 0);
      } catch {}
    };
    checkCount();
    const interval = setInterval(checkCount, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(standalone);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getFormattedDate = () => {
    const now = new Date();
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    return now.toLocaleDateString('pt-BR', options);
  };

  const firstName = user?.name ? user.name.split(' ')[0] : 'Usuário';

  return (
    <header className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-5 pt-4 pb-3 border-b border-slate-100 flex items-center justify-between notranslate" translate="no">
      <div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 capitalize">{getFormattedDate()}</span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-emerald-400 border border-slate-700/50 shadow-xs">
            <img src="/logo.jpg" alt="AF" className="w-3.5 h-3.5 rounded-sm object-cover" />
            Assistente Financeiro
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-1.5 mt-0.5">
          <span>{getGreeting()},</span>
          <span>{firstName}</span>
          <span>👋</span>
        </h1>
      </div>

      <div className="flex items-center gap-1.5">
        {!isStandalone && onOpenInstall && (
          <button
            onClick={onOpenInstall}
            className="px-2.5 py-1.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 text-[11px] font-extrabold flex items-center gap-1 shadow-xs transition-all active:scale-95 mr-1"
            title="Instalar aplicativo no celular (100% Grátis)"
          >
            <Smartphone size={13} className="text-emerald-600" />
            <span>Instalar</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
          title="Notificações e Avisos de Pagamento"
        >
          <Bell size={18} />
          {localUnread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-extrabold flex items-center justify-center shadow-xs animate-pulse">
              {localUnread > 9 ? '9+' : localUnread}
            </span>
          )}
        </button>

        <button
          onClick={onToggleHideValues}
          className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
          title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        <button
          onClick={onOpenMore}
          className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 transition-colors"
          title="Mais opções e configurações"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </header>
  );
}
