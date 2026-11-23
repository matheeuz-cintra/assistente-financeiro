import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Lock, Mail, User, ShieldCheck, ArrowLeft, RefreshCw, MailCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export function LoginView() {
  const { login, register, verifyCode, resendCode } = useAuth();
  const [step, setStep] = useState('auth'); // 'auth' | 'verify'
  const [isRegister, setIsRegister] = useState(false);
  
  // Registration & Login Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Verification OTP Fields
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpInputsRef = useRef([]);

  // Countdown timer for resending code
  useEffect(() => {
    let timer;
    if (step === 'verify' && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await register(name.trim(), email.trim(), password);
        if (res.status === 'verification_required') {
          setStep('verify');
          setResendCooldown(30);
          setCanResend(false);
          setOtp(['', '', '', '', '', '']);
          setTimeout(() => {
            otpInputsRef.current[0]?.focus();
          }, 150);
        }
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      if (err.requiresVerification) {
        setStep('verify');
        setResendCooldown(30);
        setCanResend(false);
        setOtp(['', '', '', '', '', '']);
        setInfoMessage('Seu cadastro está pendente de validação. Digite o código de 6 dígitos enviado por e-mail ou clique em reenviar.');
        setTimeout(() => {
          otpInputsRef.current[0]?.focus();
        }, 150);
      } else {
        setError(err.message || 'Erro ao realizar login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (customCode = null) => {
    const codeToVerify = customCode || otp.join('');
    if (codeToVerify.length !== 6) {
      setError('Por favor, digite os 6 dígitos do código.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyCode(email.trim(), codeToVerify);
      // On success, AuthContext triggers authenticated state automatically!
    } catch (err) {
      setError(err.message || 'Código incorreto ou expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || loading) return;
    setError('');
    setInfoMessage('');
    setLoading(true);

    try {
      const res = await resendCode(email.trim());
      setCanResend(false);
      setResendCooldown(30);
      setInfoMessage('Novo código enviado com sucesso!');
    } catch (err) {
      setError(err.message || 'Erro ao reenviar código');
    } finally {
      setLoading(false);
    }
  };

  // OTP Input navigation & paste handlers
  const handleOtpChange = (index, value) => {
    // Only accept numeric
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = cleanVal;
    setOtp(newOtp);

    // Auto advance to next input
    if (cleanVal && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are typed
    if (cleanVal && index === 5 && newOtp.every(d => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);

    if (pastedData.length === 6) {
      handleVerifyOtp(pastedData);
    } else {
      otpInputsRef.current[pastedData.length]?.focus();
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
    <div className="flex-1 flex flex-col lg:flex-row items-center justify-center p-6 lg:p-12 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white min-h-[100dvh] w-full">
      {/* Desktop Left Hero Presentation (hidden on small mobile screens) */}
      <div className="hidden lg:flex flex-col justify-center max-w-lg pr-8 space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-500/20 border border-emerald-500/30 bg-black shrink-0">
            <img 
              src="/logo.jpg" 
              alt="Assistente Financeiro Logo" 
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              100% Grátis & Seguro
            </span>
            <h1 className="text-3xl font-black tracking-tight text-white mt-1">Assistente Financeiro</h1>
          </div>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed font-normal">
          Controle suas finanças pessoais com facilidade. Registre gastos por voz, importe extratos de qualquer banco e acompanhe relatórios inteligentes tanto no computador quanto no celular.
        </p>

        {/* Highlight points */}
        <div className="space-y-3 pt-2">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400 flex items-center justify-center shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Assistente com Inteligência Artificial</h3>
              <p className="text-[11px] text-slate-400">Registre despesas e tire dúvidas digitando ou falando naturalmente pelo microfone.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <RefreshCw size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Importação de Extrato Bancário</h3>
              <p className="text-[11px] text-slate-400">Envie arquivos OFX ou CSV do Nubank, Inter, Itaú e outros com conciliação automática.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Contas a Pagar & Alertas por E-mail</h3>
              <p className="text-[11px] text-slate-400">Agende pagamentos e receba lembretes 7 dias antes, 3 dias antes e no vencimento.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Auth Card Container */}
      <div className="w-full max-w-sm flex flex-col justify-between my-auto py-2">
        {/* Mobile-only Brand Header */}
        <div className="pt-2 text-center space-y-3 lg:hidden mb-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl overflow-hidden shadow-2xl shadow-purple-900/40 border border-slate-700/60 bg-black">
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

        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-4 w-full">
        {step === 'auth' ? (
          <>
            {/* Tabs Entrar / Criar Conta */}
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
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
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
                    autoCapitalize="none"
                    autoCorrect="off"
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
                    {isRegister ? 'Continuar com Verificação' : 'Acessar Finanças'} <ArrowRight size={15} />
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
          </>
        ) : (
          /* STEP 2: VERIFICATION OTP SCREEN */
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
              <MailCheck size={24} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-white">Validar seu E-mail</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enviamos um código de 6 dígitos para:
              </p>
              <p className="text-xs font-semibold text-emerald-400 mt-0.5 break-all">
                {email}
              </p>
            </div>

            {error && (
              <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs font-medium text-center">
                {error}
              </div>
            )}

            {infoMessage && (
              <div className="p-2.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 text-xs font-medium text-center">
                {infoMessage}
              </div>
            )}



            {/* 6 Digit Inputs */}
            <div className="flex justify-between gap-1.5 pt-1" onPaste={handleOtpPaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputsRef.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  className="w-10 h-12 text-center text-lg font-bold rounded-xl bg-slate-900 border border-slate-700 text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleVerifyOtp()}
              disabled={loading || otp.join('').length !== 6}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-98 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Confirmar Código e Acessar <ArrowRight size={15} /></>
              )}
            </button>

            {/* Resend & Back actions */}
            <div className="pt-2 flex flex-col items-center gap-2 text-xs">
              <button
                type="button"
                onClick={handleResend}
                disabled={!canResend || loading}
                className={`flex items-center gap-1 font-semibold ${
                  canResend ? 'text-emerald-400 hover:underline' : 'text-slate-500'
                }`}
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                {canResend ? 'Reenviar código por e-mail' : `Reenviar código em ${resendCooldown}s`}
              </button>

              <button
                type="button"
                onClick={() => { setStep('auth'); setError(''); setInfoMessage(''); }}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] mt-1"
              >
                <ArrowLeft size={13} /> Corrigir e-mail ou voltar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="text-center text-[10px] text-slate-500 flex items-center justify-center gap-1 pb-4">
        <ShieldCheck size={13} className="text-emerald-500" /> Dados criptografados e armazenados com segurança.
      </div>
    </div>
  </div>
  );
}
