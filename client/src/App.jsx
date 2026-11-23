import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Header } from './components/Header.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { DesktopSidebar } from './components/DesktopSidebar.jsx';
import { DesktopHeader } from './components/DesktopHeader.jsx';
import { QuickAddModal } from './components/QuickAddModal.jsx';
import { TransactionDetailModal } from './components/TransactionDetailModal.jsx';
import { ImportStatementModal } from './components/ImportStatementModal.jsx';
import { InstallAppModal } from './components/InstallAppModal.jsx';
import { NotificationsModal } from './components/NotificationsModal.jsx';
import { ScheduledPaymentsModal } from './components/ScheduledPaymentsModal.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { ChatView } from './views/ChatView.jsx';
import { HistoryView } from './views/HistoryView.jsx';
import { ReportsView } from './views/ReportsView.jsx';
import { MoreView } from './views/MoreView.jsx';
import { LoginView } from './views/LoginView.jsx';
import { RefreshCw, Monitor, Smartphone } from 'lucide-react';
import { apiClient } from './api/client.js';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'reports', 'chat', 'history', 'more'
  const [moreSubSection, setMoreSubSection] = useState('menu');
  const [hideValues, setHideValues] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isScheduledPaymentsOpen, setIsScheduledPaymentsOpen] = useState(false);
  const [scheduledPaymentsTab, setScheduledPaymentsTab] = useState('pending');
  const [importAccountId, setImportAccountId] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Live badge counts
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  // Responsive mode state: 'desktop' or 'mobile'
  const [viewMode, setViewMode] = useState(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('finai_view_mode') : null;
    if (saved === 'desktop' || saved === 'mobile') return saved;
    return typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'desktop' : 'mobile';
  });

  // Listen to window resize if user has not explicitly locked a preference
  useEffect(() => {
    const handleResize = () => {
      const saved = localStorage.getItem('finai_view_mode');
      if (!saved) {
        setViewMode(window.innerWidth >= 1024 ? 'desktop' : 'mobile');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Poll badges (notifications & pending payments)
  const refreshBadges = async () => {
    try {
      const [notifs, sched] = await Promise.all([
        apiClient.getUnreadNotificationsCount().catch(() => ({ count: 0 })),
        apiClient.getScheduledPayments({ status: 'pending' }).catch(() => [])
      ]);
      setUnreadNotificationsCount(notifs?.count || 0);
      setPendingPaymentsCount(Array.isArray(sched) ? sched.length : 0);
    } catch {}
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshBadges();
      const interval = setInterval(refreshBadges, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, dataVersion]);

  const handleToggleViewMode = () => {
    const next = viewMode === 'desktop' ? 'mobile' : 'desktop';
    setViewMode(next);
    localStorage.setItem('finai_view_mode', next);
  };

  const handleSelectTab = (tab, subSection = 'menu') => {
    setActiveTab(tab);
    if (tab === 'more') {
      setMoreSubSection(subSection);
    }
  };

  const handleOpenScheduledPayments = (tab = 'pending') => {
    setScheduledPaymentsTab(tab);
    setIsScheduledPaymentsOpen(true);
  };

  const handleDataChanged = () => {
    setDataVersion((v) => v + 1);
    refreshBadges();
  };

  const handleOpenImport = (accountId = null) => {
    setImportAccountId(accountId);
    setIsImportOpen(true);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <RefreshCw size={36} className="animate-spin text-emerald-500 mb-3" />
        <span className="text-sm font-semibold text-slate-300">Iniciando Assistente Financeiro...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-slate-950">
        <LoginView />
      </div>
    );
  }

  // Modals shared across both desktop and mobile views
  const renderSharedModals = () => (
    <>
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleDataChanged}
        onOpenVoiceAssistant={() => setActiveTab('chat')}
        onOpenScheduledPayments={handleOpenScheduledPayments}
      />

      <ImportStatementModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleDataChanged}
        initialAccountId={importAccountId}
      />

      <InstallAppModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onDataChanged={handleDataChanged}
        onOpenScheduledPayments={handleOpenScheduledPayments}
      />

      <ScheduledPaymentsModal
        isOpen={isScheduledPaymentsOpen}
        initialTab={scheduledPaymentsTab}
        onClose={() => setIsScheduledPaymentsOpen(false)}
        onDataChanged={handleDataChanged}
      />

      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onUpdated={handleDataChanged}
      />
    </>
  );

  // -------------------------------------------------------------
  // DESKTOP LAYOUT (TELA PARA COMPUTADOR)
  // -------------------------------------------------------------
  if (viewMode === 'desktop') {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-row w-full text-slate-800">
        {/* Desktop Sidebar Navigation */}
        <DesktopSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
          onOpenImport={handleOpenImport}
          onOpenScheduledPayments={handleOpenScheduledPayments}
          onToggleViewMode={handleToggleViewMode}
          pendingPaymentsCount={pendingPaymentsCount}
        />

        {/* Main Workspace Area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
          <DesktopHeader
            activeTab={activeTab}
            hideValues={hideValues}
            onToggleHideValues={() => setHideValues((v) => !v)}
            onOpenQuickAdd={() => setIsQuickAddOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            onOpenScheduledPayments={handleOpenScheduledPayments}
            onToggleViewMode={handleToggleViewMode}
            unreadNotificationsCount={unreadNotificationsCount}
            pendingPaymentsCount={pendingPaymentsCount}
          />

          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                key={`dash-${dataVersion}`}
                hideValues={hideValues}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onOpenImport={handleOpenImport}
                onOpenInstall={() => setIsInstallOpen(true)}
                onOpenAssistant={() => setActiveTab('chat')}
                onSelectTransaction={(tx) => setSelectedTransaction(tx)}
                onNavigateTab={(tab) => handleSelectTab(tab)}
                onOpenScheduledPayments={handleOpenScheduledPayments}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView key={`rep-${dataVersion}`} hideValues={hideValues} />
            )}

            {activeTab === 'chat' && (
              <ChatView onDataChanged={handleDataChanged} />
            )}

            {activeTab === 'history' && (
              <HistoryView
                key={`hist-${dataVersion}`}
                hideValues={hideValues}
                onOpenImport={handleOpenImport}
                onSelectTransaction={(tx) => setSelectedTransaction(tx)}
              />
            )}

            {activeTab === 'more' && (
              <MoreView 
                key={`more-${moreSubSection}-${dataVersion}`}
                onDataChanged={handleDataChanged} 
                onOpenImport={handleOpenImport}
                onOpenInstall={() => setIsInstallOpen(true)}
                onOpenScheduledPayments={handleOpenScheduledPayments}
                initialSection={moreSubSection}
              />
            )}
          </main>
        </div>

        {renderSharedModals()}
      </div>
    );
  }

  // -------------------------------------------------------------
  // MOBILE LAYOUT (TELA PARA CELULAR)
  // -------------------------------------------------------------
  return (
    <div className="mobile-simulator-backdrop min-h-screen bg-slate-950 py-0 lg:py-6">
      {/* Switcher bar on top when viewed on large screens */}
      <div className="hidden lg:flex items-center justify-between w-full max-w-[480px] mb-3 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl text-white">
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Smartphone size={15} className="text-emerald-400" />
          <span>Visão de Celular (480px)</span>
        </span>
        <button
          type="button"
          onClick={handleToggleViewMode}
          className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 cursor-pointer"
        >
          <Monitor size={13} />
          <span>Mudar para Computador</span>
        </button>
      </div>

      <div className="mobile-frame">
        {/* Mobile Top Header */}
        {activeTab !== 'chat' && (
          <Header
            hideValues={hideValues}
            onToggleHideValues={() => setHideValues((v) => !v)}
            onOpenMore={() => handleSelectTab('more')}
            onOpenInstall={() => setIsInstallOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            unreadCount={unreadNotificationsCount}
          />
        )}

        {/* Main Views */}
        <main className="flex-1 flex flex-col overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <DashboardView
              key={`dash-${dataVersion}`}
              hideValues={hideValues}
              onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              onOpenImport={handleOpenImport}
              onOpenInstall={() => setIsInstallOpen(true)}
              onOpenAssistant={() => setActiveTab('chat')}
              onSelectTransaction={(tx) => setSelectedTransaction(tx)}
              onNavigateTab={(tab) => handleSelectTab(tab)}
              onOpenScheduledPayments={handleOpenScheduledPayments}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView key={`rep-${dataVersion}`} hideValues={hideValues} />
          )}

          {activeTab === 'chat' && (
            <ChatView onDataChanged={handleDataChanged} />
          )}

          {activeTab === 'history' && (
            <HistoryView
              key={`hist-${dataVersion}`}
              hideValues={hideValues}
              onOpenImport={handleOpenImport}
              onSelectTransaction={(tx) => setSelectedTransaction(tx)}
            />
          )}

          {activeTab === 'more' && (
            <MoreView 
              key={`more-${moreSubSection}-${dataVersion}`}
              onDataChanged={handleDataChanged} 
              onOpenImport={handleOpenImport}
              onOpenInstall={() => setIsInstallOpen(true)}
              onOpenScheduledPayments={handleOpenScheduledPayments}
              initialSection={moreSubSection}
            />
          )}
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav
          activeTab={activeTab}
          onSelectTab={(tab) => handleSelectTab(tab)}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        />
      </div>

      {renderSharedModals()}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
