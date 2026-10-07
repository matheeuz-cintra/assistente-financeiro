import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { Header } from './components/Header.jsx';
import { BottomNav } from './components/BottomNav.jsx';
import { QuickAddModal } from './components/QuickAddModal.jsx';
import { TransactionDetailModal } from './components/TransactionDetailModal.jsx';
import { ImportStatementModal } from './components/ImportStatementModal.jsx';
import { InstallAppModal } from './components/InstallAppModal.jsx';
import { DashboardView } from './views/DashboardView.jsx';
import { ChatView } from './views/ChatView.jsx';
import { HistoryView } from './views/HistoryView.jsx';
import { ReportsView } from './views/ReportsView.jsx';
import { MoreView } from './views/MoreView.jsx';
import { LoginView } from './views/LoginView.jsx';
import { RefreshCw } from 'lucide-react';

function MainApp() {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'reports', 'chat', 'history', 'more'
  const [hideValues, setHideValues] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [importAccountId, setImportAccountId] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  if (loading) {
    return (
      <div className="mobile-frame items-center justify-center bg-slate-900 text-white">
        <RefreshCw size={36} className="animate-spin text-emerald-500 mb-3" />
        <span className="text-sm font-semibold text-slate-300">Iniciando Assistente Financeiro...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mobile-frame">
        <LoginView />
      </div>
    );
  }

  const handleDataChanged = () => {
    setDataVersion((v) => v + 1);
  };

  const handleOpenImport = (accountId = null) => {
    setImportAccountId(accountId);
    setIsImportOpen(true);
  };

  return (
    <div className="mobile-frame">
      {/* Mobile Top Header (except in Chat View for a native immersive feel) */}
      {activeTab !== 'chat' && (
        <Header
          hideValues={hideValues}
          onToggleHideValues={() => setHideValues((v) => !v)}
          onOpenMore={() => setActiveTab('more')}
          onOpenInstall={() => setIsInstallOpen(true)}
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
            onNavigateTab={(tab) => setActiveTab(tab)}
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
            onDataChanged={handleDataChanged} 
            onOpenImport={handleOpenImport}
            onOpenInstall={() => setIsInstallOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* Quick Add Floating Modal Sheet */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={handleDataChanged}
        onOpenVoiceAssistant={() => setActiveTab('chat')}
      />

      {/* Import Bank Statement Modal */}
      <ImportStatementModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={handleDataChanged}
        initialAccountId={importAccountId}
      />

      {/* Install App on Mobile PWA Modal */}
      <InstallAppModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      {/* Transaction Detail & Edit Modal */}
      <TransactionDetailModal
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onUpdated={handleDataChanged}
      />
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
