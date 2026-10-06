import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mobile-frame items-center justify-center p-6 text-center bg-slate-900 text-white min-h-[100dvh]">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 mx-auto">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">Ops! Algo inesperado aconteceu</h2>
          <p className="text-xs text-slate-400 max-w-xs mb-6">
            Ocorreu uma pequena falha na exibição. Clique no botão abaixo para recarregar sua sessão com segurança.
          </p>
          <button
            onClick={this.handleReload}
            className="px-6 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
          >
            <RefreshCw size={16} /> Recarregar Finanças
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
