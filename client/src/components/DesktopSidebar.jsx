import React from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  MessageSquare, 
  Receipt, 
  Settings, 
  ShieldCheck, 
  Plus, 
  FileSpreadsheet, 
  Calendar, 
  LogOut, 
  Smartphone, 
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function DesktopSidebar({ 
  activeTab, 
  onSelectTab, 
  onOpenQuickAdd, 
  onOpenImport, 
  onOpenScheduledPayments,
  onToggleViewMode,
  pendingPaymentsCount = 0
}) {
  const { user, logout } = useAuth();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      subtitle: 'Visão Geral & Saldos',
      icon: LayoutDashboard,
      color: 'text-emerald-500'
    },
    {
      id: 'reports',
      label: 'Relatórios & Gráficos',
      subtitle: 'Análises & Insights IA',
      icon: BarChart3,
      color: 'text-blue-500'
    },
    {
      id: 'chat',
      label: 'Assistente IA',
      subtitle: 'Comandos por voz e texto',
      icon: MessageSquare,
      badge: 'IA',
      color: 'text-purple-500'
    },
    {
      id: 'history',
      label: 'Histórico & Extrato',
      subtitle: 'Lançamentos detalhados',
      icon: Receipt,
      color: 'text-amber-500'
    },
    {
      id: 'more',
      label: 'Configurações & Mais',
      subtitle: 'Contas, cartões e regras',
      icon: Settings,
      color: 'text-slate-400'
    }
  ];

  return (
    <aside className="w-72 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shrink-0 select-none h-screen sticky top-0 shadow-xl z-40 notranslate" translate="no">
      {/* Brand & User Header */}
      <div className="p-5 pb-3 space-y-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/10 border border-emerald-500/30 bg-black shrink-0">
            <img src="/logo.jpg" alt="AF" className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white tracking-tight">Assistente Financeiro</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" title="Sistema online" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              Modo Computador 💻
            </span>
          </div>
        </div>

        {/* User Card */}
        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate block">{user?.name}</span>
                {user?.role === 'admin' && (
                  <span className="px-1.5 py-0.2 rounded-md text-[8px] font-black uppercase bg-purple-600 text-white shrink-0">
                    Admin
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-400 truncate block">{user?.email}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            title="Sair da conta"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Primary CTA Buttons */}
        <div className="space-y-1.5 pt-1">
          <button
            type="button"
            onClick={onOpenQuickAdd}
            className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Plus size={16} className="stroke-[3]" />
            <span>Novo Lançamento</span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={onOpenImport}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer"
              title="Importar extrato bancário em OFX ou CSV"
            >
              <FileSpreadsheet size={13} className="text-emerald-400" />
              <span>Extrato</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenScheduledPayments('pending')}
              className="py-2 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all text-center relative cursor-pointer"
              title="Contas a pagar e agendamentos futuros"
            >
              <Calendar size={13} className="text-amber-400" />
              <span>A Pagar</span>
              {pendingPaymentsCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navegação
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer group ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400 group-hover:text-white'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs block">{item.label}</span>
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-purple-500 text-white">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 block leading-tight">{item.subtitle}</span>
                </div>
              </div>
              <ChevronRight
                size={14}
                className={`transition-transform ${
                  isActive ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600 opacity-0 group-hover:opacity-100'
                }`}
              />
            </button>
          );
        })}

        {/* Special Admin Direct Link if user is admin */}
        {user?.role === 'admin' && (
          <div className="pt-2">
            <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-400">
              Administração
            </div>
            <button
              onClick={() => onSelectTab('more', 'admin_users')}
              className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between transition-all cursor-pointer group ${
                activeTab === 'more'
                  ? 'bg-purple-500/15 text-purple-300 font-bold border border-purple-500/30'
                  : 'text-slate-300 hover:bg-purple-500/10 hover:text-purple-200 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-900/60 border border-purple-500/30 text-purple-300 flex items-center justify-center">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <span className="text-xs block">Gerenciar Usuários</span>
                  <span className="text-[10px] text-purple-400 block leading-tight">Ativar / Desativar contas</span>
                </div>
              </div>
              <ChevronRight size={14} className="text-purple-400" />
            </button>
          </div>
        )}
      </nav>

      {/* Footer Controls & Switch to Mobile View */}
      <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950/40">
        <button
          type="button"
          onClick={onToggleViewMode}
          className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
          title="Alternar para o layout compacto de celular"
        >
          <Smartphone size={14} className="text-emerald-400" />
          <span>Ver como Celular 📱</span>
        </button>

        <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1">
          <span>FinAI Assistente v2.4</span>
          <span className="text-emerald-500 font-semibold">100% Grátis</span>
        </div>
      </div>
    </aside>
  );
}
