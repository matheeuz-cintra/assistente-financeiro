import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, Bot, User, CheckCircle2, AlertTriangle, ArrowRight, CornerDownLeft } from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '../api/client.js';

export function ChatView({ onDataChanged }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const quickPrompts = [
    'Gastei R$ 25 no Uber',
    'Recebi R$ 3.500 de salário',
    'Quanto gastei esse mês?',
    'Gastei 500',
    'Qual foi meu maior gasto?',
    'Transfere 300 do Nubank para o Inter',
    'Minha internet custa R$ 100 todo dia 10',
    'Corrige meu último gasto para 30 reais',
    'Apaga meu último lançamento'
  ];

  useEffect(() => {
    loadChatHistory();
    initSpeechRecognition();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChatHistory = async () => {
    try {
      const history = await apiClient.getAssistantHistory();
      if (history.length === 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: 'Olá! Sou seu assistente financeiro pessoal. Você pode me falar ou escrever seus gastos, receitas ou tirar dúvidas.',
            created_at: new Date().toISOString()
          }
        ]);
      } else {
        setMessages(history);
      }
    } catch (err) {
      console.error('Error loading chat history:', err);
    }
  };

  const initSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      // Automatically send spoken phrase
      handleSend(transcript);
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Reconhecimento de voz não suportado neste navegador. Digite sua mensagem no campo abaixo.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Speech start error:', err);
      }
    }
  };

  const handleSend = async (customText = null) => {
    const textToSend = (customText !== null ? customText : inputText).trim();
    if (!textToSend || loading) return;

    setInputText('');

    // Append user message immediately
    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await apiClient.sendAssistantMessage(textToSend);
      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: response.message,
        metadata: response.metadata,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // If registered income or budget milestone, trigger confetti
      if (response.metadata?.intent === 'registered' && response.metadata?.transaction?.type === 'income') {
        confetti({ particleCount: 60, spread: 55, origin: { y: 0.8 } });
      }

      // Notify parent to refresh balances/dashboard
      if (onDataChanged) {
        onDataChanged();
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar seu pedido. Tente novamente.',
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-65px)] max-h-[100dvh] bg-slate-50">
      {/* Header Info */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-100 flex items-center justify-between z-10 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full overflow-hidden border border-emerald-400/50 shadow-xs bg-slate-900">
            <img src="/logo.jpg" alt="AF" className="w-full h-full object-cover" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800">Assistente Financeiro</h2>
            <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Online e pronto
            </span>
          </div>
        </div>

        <button
          onClick={loadChatHistory}
          className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
        >
          Limpar visão
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-150`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                  isUser
                    ? 'bg-slate-900 text-white rounded-br-xs font-medium'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-xs'
                }`}
              >
                {/* Text content with preserved line breaks */}
                <p className="whitespace-pre-line">{m.content}</p>

                {/* Structured Metadata Card if Assistant Registered a Transaction */}
                {m.metadata?.transaction && (
                  <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[11px] flex items-center justify-between text-emerald-900">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      Lançamento salvo no banco
                    </span>
                    <span className="font-bold text-emerald-700">
                      R$ {m.metadata.transaction.amount?.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Structured Metadata Card for Clarification Needed */}
                {m.metadata?.intent === 'clarification_needed' && (
                  <div className="mt-2 p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] flex items-center gap-1.5 text-amber-900 font-medium">
                    <AlertTriangle size={14} className="text-amber-600" />
                    Aguardando detalhes para registrar
                  </div>
                )}
              </div>
              <span className="text-[9px] text-slate-400 mt-1 px-1">
                {m.created_at ? new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center animate-pulse">
              <Bot size={14} />
            </div>
            <span>Interpretando comando financeiro...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Chips */}
      <div className="bg-white/80 backdrop-blur-xs px-3 py-1.5 border-t border-slate-100 overflow-x-auto no-scrollbar flex items-center gap-1.5">
        <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap flex items-center gap-1">
          <Sparkles size={11} className="text-emerald-500" /> Exemplos:
        </span>
        {quickPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSend(p)}
            className="text-[11px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 transition-colors border border-slate-200/50"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Voice Listening Active Indicator Banner */}
      {isListening && (
        <div className="bg-emerald-600 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold animate-pulse">
          <span className="flex items-center gap-2">
            <Mic size={16} /> Ouvindo sua voz em português... Fale agora!
          </span>
          <button onClick={toggleListening} className="text-emerald-100 underline text-[11px]">
            Parar
          </button>
        </div>
      )}

      {/* Bottom Input Field */}
      <div className="bg-white p-3 border-t border-slate-200/80 mb-14">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          {/* Mic Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-rose-600 text-white mic-active'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
            }`}
            title={isListening ? 'Parar gravação' : 'Falar por voz'}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite ou fale o que aconteceu..."
              className="w-full pl-3.5 pr-10 py-2.5 rounded-2xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || loading}
            className="w-11 h-11 rounded-2xl bg-emerald-600 disabled:opacity-40 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 transition-all"
            title="Enviar mensagem"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
