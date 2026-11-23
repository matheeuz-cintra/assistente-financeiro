import React, { useState } from 'react';
import { X, Lock, Check, ShieldCheck, ArrowRight, UserCheck, KeyRound } from 'lucide-react';
import { useProfile } from '../context/ProfileContext.jsx';

export function ProfileSwitcherModal({ isOpen, onClose }) {
  const { profiles, activeProfile, switchProfile } = useProfile();
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSelect = async (profile) => {
    setError('');
    if (profile.id === activeProfile?.id) {
      onClose();
      return;
    }

    if (profile.has_pin) {
      setSelectedTarget(profile);
      setPin('');
      return;
    }

    try {
      setLoading(true);
      await switchProfile(profile.id);
      onClose();
    } catch (err) {
      setError(err.message || 'Erro ao trocar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPin = async (e) => {
    e.preventDefault();
    if (!selectedTarget) return;

    if (!pin || pin.length !== 4) {
      setError('Por favor, digite os 4 números do PIN.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await switchProfile(selectedTarget.id, pin);
      setSelectedTarget(null);
      setPin('');
      onClose();
    } catch (err) {
      setError(err.message || 'PIN incorreto. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              👤
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Trocar Perfil de Acesso</h2>
              <span className="text-[11px] text-slate-400">Selecione quem está operando a conta</span>
            </div>
          </div>
          <button
            onClick={() => {
              setSelectedTarget(null);
              setPin('');
              setError('');
              onClose();
            }}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* PIN Entry Prompt if selected target has PIN */}
        {selectedTarget ? (
          <form onSubmit={handleConfirmPin} className="space-y-4 py-2">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 border border-purple-500/20 flex items-center justify-center mx-auto mb-2 text-xl shadow-inner">
                {selectedTarget.icon || '🔒'}
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                Acesso protegido: {selectedTarget.name}
              </h3>
              <p className="text-xs text-slate-400">
                Digite o PIN numérico de 4 dígitos para assumir este perfil
              </p>
            </div>

            <div className="flex justify-center my-3">
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-36 text-center text-2xl tracking-[0.5em] py-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-purple-600 font-mono font-bold"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedTarget(null);
                  setPin('');
                  setError('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={loading || pin.length !== 4}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-purple-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Acessar</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </form>
        ) : (
          /* Profile Selection List */
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {profiles.map((p) => {
              const isActive = p.id === activeProfile?.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(p)}
                  className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200/80 bg-white hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shrink-0 shadow-inner"
                      style={{ backgroundColor: `${p.color || '#10b981'}20` }}
                    >
                      {p.icon || '👤'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">{p.name}</span>
                        {isActive && (
                          <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black uppercase bg-emerald-600 text-white">
                            Atual
                          </span>
                        )}
                        {p.has_pin && (
                          <span title="Protegido por PIN" className="text-slate-400">
                            <Lock size={12} />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {p.role_type === 'admin'
                          ? 'Acesso total a todas as funções'
                          : p.can_view_balances
                          ? 'Pode ver saldos da empresa'
                          : 'Saldos ocultos para este perfil'}
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 text-slate-400">
                    {isActive ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check size={14} />
                      </div>
                    ) : (
                      <div className="text-[11px] font-semibold text-emerald-600 hover:underline">
                        Trocar
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span>As permissões de cada perfil são configuradas pelo Administrador.</span>
        </div>
      </div>
    </div>
  );
}
