import React, { useState, useEffect } from 'react';
import { 
  Eye, 
  EyeOff, 
  Bell, 
  Calendar, 
  Plus, 
  Smartphone, 
  Monitor, 
  Sparkles,
  Search,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useProfile } from '../context/ProfileContext.jsx';
import { apiClient } from '../api/client.js';

export function DesktopHeader({ 
  activeTab, 
  hideValues, 
  onToggleHideValues, 
  onOpenQuickAdd,
  onOpenNotifications,
  onOpenScheduledPayments,
  onToggleViewMode,
  unreadNotificationsCount = 0,
  pendingPaymentsCount = 0
}) {
  const { user } = useAuth();
  const { activeProfile, openSwitcher } = useProfile();
  const [localUnread, setLocalUnread] = useState(unreadNotificationsCount);

  useEffect(() => {
    setLocalUnread(unreadNotificationsCount);
  }, [unreadNotificationsCount]);

  useEffect(() => {
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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const getFormattedDate = () => {
    const now = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const str = now.toLocaleDateString('pt-BR', options);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  const tabTitles = {
    dashboard: {
      title: 'Dashboard Geral',
      subtitle: 'Visão consolidada de contas, gastos, cartões e orçamentos'
    },
    reports: {
      title: 'Relatórios & Inteligência',
      subtitle: 'Análises detalhadas, comparativo mensal e insights da IA'
    },
    chat: {
      title: 'Assistente Financeiro IA',
      subtitle: 'Converse por voz ou texto para registrar e analisar finanças'
    },
    history: {
      title: 'Histórico de Transações',
      subtitle: 'Extrato completo com filtros por categoria, conta e período'
    },
    more: {
      title: 'Configurações & Painel',
      subtitle: 'Gerenciamento de contas bancárias, cartões, despesas e usuários'
    }
  };

  const currentInfo = tabTitles[activeTab] || tabTitles.dashboard;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Usuário';

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs notranslate" translate="no">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <span>{getGreeting()}, {firstName}</span>
          <span>•</span>
          <span className="capitalize">{getFormattedDate()}</span>
        </div>
        <h1 className="text-xl font-extrabold text-slate-800 tracking-tight mt-0.5 flex items-center gap-2">
          <span>{currentInfo.title}</span>
          {activeTab === 'chat' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
              <Sparkles size={11} className="text-purple-600" /> IA Ativa
            </span>
          )}
        </h1>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2.5">
        {/* Active Company Profile Switcher Button */}
        <button
          type="button"
          onClick={openSwitcher}
          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs group"
          title={user?.isCompanyOwner ? "Clique para alternar o perfil de acesso da empresa" : "Perfil corporativo atribuído"}
        >
          <span className="text-base">{activeProfile?.icon || '👤'}</span>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 block font-normal leading-none">
              {user?.isCompanyOwner ? 'Perfil Empresa' : user?.name || 'Funcionário'}
            </span>
            <span className="text-xs text-slate-800 font-bold block leading-tight">{activeProfile?.name || 'Administrador'}</span>
          </div>
          {user?.isCompanyOwner && (
            <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 mx-0.5" />

        {/* Toggle Mode Button: Celular / Computador */}
        <button
          type="button"
          onClick={onToggleViewMode}
          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all border border-slate-200 shadow-2xs cursor-pointer"
          title="Alternar entre tela de Computador e tela de Celular"
        >
          <Smartphone size={15} className="text-emerald-600" />
          <span>Visão Celular</span>
        </button>

        <div className="h-6 w-px bg-slate-200 mx-1" />

        {/* Hide / Show Values Toggle */}
        <button
          type="button"
          onClick={onToggleHideValues}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          title={hideValues ? 'Mostrar valores financeiros' : 'Ocultar valores financeiros'}
        >
          {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>

        {/* Scheduled Payments Notification Shortcut */}
        <button
          type="button"
          onClick={() => onOpenScheduledPayments('pending')}
          className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs relative"
          title="Ver contas a pagar e vencimentos"
        >
          <Calendar size={15} className="text-amber-600" />
          <span>Contas a Pagar</span>
          {pendingPaymentsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-extrabold text-[10px]">
              {pendingPaymentsCount}
            </span>
          )}
        </button>

        {/* Notifications Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          title="Avisos e Notificações"
        >
          <Bell size={18} />
          {localUnread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-extrabold flex items-center justify-center shadow-xs animate-pulse">
              {localUnread > 9 ? '9+' : localUnread}
            </span>
          )}
        </button>

        {/* Quick Add CTA */}
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={16} className="stroke-[3]" />
          <span>Novo Lançamento</span>
        </button>
      </div>
    </header>
  );
}
