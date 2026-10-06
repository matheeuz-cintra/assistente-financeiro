import React, { useState } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginView() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        await register(name, email, password);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'Erro ao realizar login');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo@finai.com', '123456');
    } catch (err) {
      setError(err.message || 'Erro no login demo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-6 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white min-h-[100dvh]">
      {/* Brand Header */}
      <div className="pt-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/40 border border-slate-700/60 bg-black">
          <img 
            src="/logo.jpg" 
            alt="Assistente Financeiro Logo" 
            className="w-full h-full object-cover"
          />
        </div>

        <div>
          <h1 className="text-2xl font-black tracking-tight text-white">Assistente Financeiro</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Seu assistente financeiro inteligente por voz e texto
          </p>
        </div>
      </div>

      {/* Auth Card */}
      <div className="bg-slate-800/80 backdrop-blur-md rounded-3xl p-6 border border-slate-700/60 shadow-2xl space-y-4 my-auto">
        <div className="flex items-center justify-center p-1 bg-slate-900/80 rounded-2xl">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isRegister ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isRegister ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400'
            }`}
          >
            Criar Conta
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {isRegister && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400 block">Nome Completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required={isRegister}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block">E-mail</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 block">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-98 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-4"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isRegister ? 'Criar Minha Conta' : 'Acessar Finanças'} <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Demo Fast Access Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-2xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600/50 flex items-center justify-center gap-1.5 transition-all"
          >
            <Sparkles size={14} className="text-emerald-400" />
            Entrar como Conta Demonstração
          </button>
          <span className="text-[10px] text-slate-500 block text-center mt-1">
            Já vem com contas, cartões e lançamentos preenchidos!
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 pb-4">
        <ShieldCheck size={13} className="text-emerald-500" /> Dados criptografados e armazenados com segurança.
      </div>
    </div>
  );
}
