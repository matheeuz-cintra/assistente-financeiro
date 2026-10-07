import React, { useState, useEffect } from 'react';
import { 
  X, Download, Smartphone, Share, PlusSquare, CheckCircle2, 
  Sparkles, ShieldCheck, Zap, MoreVertical
} from 'lucide-react';
import confetti from 'canvas-confetti';

export function InstallAppModal({ isOpen, onClose }) {
  const [canPrompt, setCanPrompt] = useState(!!window.deferredInstallPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detect OS
    const ua = navigator.userAgent || '';
    const isAppleDevice = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroidDevice = /android/i.test(ua);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    setIsIOS(isAppleDevice);
    setIsAndroid(isAndroidDevice);
    setIsInstalled(isStandalone);

    const handlePromptAvail = () => setCanPrompt(true);
    const handleInstalled = () => {
      setIsInstalled(true);
      confetti({ particleCount: 60, spread: 55, origin: { y: 0.7 } });
    };

    window.addEventListener('pwa_install_available', handlePromptAvail);
    window.addEventListener('pwa_installed', handleInstalled);

    return () => {
      window.removeEventListener('pwa_install_available', handlePromptAvail);
      window.removeEventListener('pwa_installed', handleInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (window.deferredInstallPrompt) {
      window.deferredInstallPrompt.prompt();
      const choice = await window.deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      }
      window.deferredInstallPrompt = null;
      setCanPrompt(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 overflow-hidden">
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Instalar no Celular</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold uppercase px-2 py-0.5 rounded-full border border-emerald-500/30">
                  100% Grátis
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">Tenha o app direto na tela do seu celular</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4">
          
          {isInstalled ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
                <CheckCircle2 size={36} />
              </div>
              <h3 className="text-base font-bold text-white">Aplicativo já Instalado!</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                O <strong>Assistente Financeiro</strong> já está disponível na tela inicial do seu aparelho para acesso rápido em tela cheia.
              </p>
            </div>
          ) : (
            <>
              {/* Feature Highlights */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-center space-y-1">
                  <Smartphone size={18} className="mx-auto text-emerald-400" />
                  <span className="text-[11px] font-bold block text-white">Tela Cheia</span>
                  <span className="text-[9px] text-slate-400 block leading-tight">Sem barra de navegador</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-center space-y-1">
                  <Zap size={18} className="mx-auto text-amber-400" />
                  <span className="text-[11px] font-bold block text-white">1 Toque</span>
                  <span className="text-[9px] text-slate-400 block leading-tight">Abre instantâneo</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-slate-800/70 border border-slate-700/60 text-center space-y-1">
                  <ShieldCheck size={18} className="mx-auto text-blue-400" />
                  <span className="text-[11px] font-bold block text-white">Leve & Seguro</span>
                  <span className="text-[9px] text-slate-400 block leading-tight">Não pesa na memória</span>
                </div>
              </div>

              {/* Direct 1-Click Install Button for Android / Chrome if prompt available */}
              {canPrompt && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600/30 to-teal-600/20 border border-emerald-500/40 text-center space-y-2">
                  <span className="text-xs font-bold text-white block">
                    ✨ Seu celular é compatível com instalação em 1 clique:
                  </span>
                  <button
                    onClick={handleInstallClick}
                    className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/40 transition-all active:scale-95"
                  >
                    <Download size={16} /> Instalar Agora no Celular
                  </button>
                </div>
              )}

              {/* Step-by-step for iPhone (iOS Safari) */}
              {isIOS && (
                <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-purple-300">
                    <Smartphone size={16} /> Como instalar no iPhone (Safari):
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <span>Toque no botão <strong>Compartilhar</strong> no rodapé do Safari</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
                          (É o ícone de um quadradinho com uma seta para cima <Share size={12} className="inline text-purple-400" />)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <span>Role as opções para baixo e toque em:</span>
                        <strong className="text-white block mt-0.5 flex items-center gap-1">
                          <PlusSquare size={13} className="text-emerald-400" /> "Adicionar à Tela de Início"
                        </strong>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <span>Toque em <strong>"Adicionar"</strong> no canto superior direito.</span>
                        <span className="text-[10px] text-emerald-400 block mt-0.5 font-semibold">
                          Pronto! O ícone do FinAI aparecerá na sua tela inicial.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step-by-step for Android (Chrome / Samsung) if prompt not directly showing */}
              {(!canPrompt || isAndroid) && (
                <div className="p-4 rounded-3xl bg-slate-800/90 border border-slate-700 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-xs text-emerald-300">
                    <Smartphone size={16} /> Como instalar no Android (Google Chrome):
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div>
                        <span>Toque nos <strong>três pontinhos (menu)</strong> no topo do Chrome</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5 flex items-center gap-1">
                          (Fica no canto superior direito <MoreVertical size={12} className="inline text-emerald-400" />)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div>
                        <span>Toque na opção <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong></span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                        3
                      </div>
                      <div>
                        <span>Confirme tocando em <strong>"Instalar"</strong>.</span>
                        <span className="text-[10px] text-emerald-400 block mt-0.5 font-semibold">
                          Pronto! Ele funcionará como um app nativo baixado da Play Store!
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
