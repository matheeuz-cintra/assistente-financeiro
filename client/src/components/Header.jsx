import React from 'react';
import { Eye, EyeOff, SlidersHorizontal, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function Header({ hideValues, onToggleHideValues, onOpenMore }) {
  const { user } = useAuth();

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

      <div className="flex items-center gap-2">
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
