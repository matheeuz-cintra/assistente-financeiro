import React from 'react';
import { Home, BarChart2, MessageSquare, Receipt, Menu, Plus } from 'lucide-react';

export function BottomNav({ activeTab, onSelectTab, onOpenQuickAdd }) {
  const navItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'reports', label: 'Relatórios', icon: BarChart2 },
    { id: 'add_button', isAction: true },
    { id: 'chat', label: 'Assistente', icon: MessageSquare },
    { id: 'history', label: 'Histórico', icon: Receipt },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-2 py-1.5 z-40 flex items-center justify-around shadow-lg select-none">
      {navItems.map((item) => {
        if (item.isAction) {
          return (
            <button
              key="quick_add_btn"
              onClick={onOpenQuickAdd}
              className="relative -top-4 w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none ring-4 ring-white"
              title="Novo Lançamento"
            >
              <Plus size={28} strokeWidth={2.5} />
            </button>
          );
        }

        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-150 ${
              isActive
                ? 'text-emerald-600 font-semibold'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className={`relative p-1 rounded-xl transition-colors ${isActive ? 'bg-emerald-50' : ''}`}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {item.id === 'chat' && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-[11px] tracking-tight mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
