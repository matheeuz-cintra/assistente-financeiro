import React, { useState, useEffect, useRef } from 'react';
import { 
  X, UploadCloud, FileSpreadsheet, AlertTriangle, CheckCircle2, 
  ArrowDownRight, ArrowUpRight, Check, ChevronDown, Info, RefreshCw, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { apiClient } from '../api/client.js';

export function ImportStatementModal({ isOpen, onClose, onSuccess, initialAccountId }) {
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Success
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  
  // File state
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Parse state & results
  const [parsing, setParsing] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'expense', 'income', 'duplicates'
  const [error, setError] = useState('');

  // Import state
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState(null);

  // Help tips accordion
  const [showTips, setShowTips] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      resetState();
    }
  }, [isOpen]);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setParseResult(null);
    setTransactions([]);
    setError('');
    setImporting(false);
    setImportSummary(null);
    setActiveFilter('all');
    if (!initialAccountId) {
      setSelectedAccountId('');
    }
  };

  const loadInitialData = async () => {
    try {
      const [accs, cats] = await Promise.all([
        apiClient.getAccounts(),
        apiClient.getCategories()
      ]);
      setAccounts(accs);
      setCategories(cats);

      if (initialAccountId && accs.some((a) => a.id === initialAccountId)) {
        setSelectedAccountId(initialAccountId);
      } else {
        // Enforce deliberate selection
        setSelectedAccountId('');
      }
    } catch (err) {
      console.error('Erro ao carregar dados para importação:', err);
    }
  };

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError('');
    }
  };

  const readFileData = (fileToRead) => {
    return new Promise((resolve, reject) => {
      const isExcel = fileToRead.name.endsWith('.xlsx') || fileToRead.name.endsWith('.xls');
      const reader = new FileReader();

      if (isExcel) {
        reader.readAsDataURL(fileToRead);
        reader.onload = () => {
          const base64 = reader.result.split(',')[1];
          resolve({ isBase64: true, content: base64 });
        };
      } else {
        reader.readAsText(fileToRead, 'utf-8');
        reader.onload = () => {
          resolve({ isBase64: false, content: reader.result });
        };
      }
      reader.onerror = (err) => reject(err);
    });
  };

  const handleAnalyze = async () => {
    if (!selectedAccountId) {
      setError('⚠️ Atenção: É OBRIGATÓRIO selecionar a conta bancária à qual este extrato pertence (ex: Nubank, Inter, Dinheiro).');
      return;
    }
    if (!file) {
      setError('Por favor, selecione ou arraste um arquivo de extrato (.OFX, .CSV ou .XLSX).');
      return;
    }

    setParsing(true);
    setError('');

    try {
      const fileData = await readFileData(file);
      const res = await apiClient.parseStatement({
        accountId: selectedAccountId,
        fileName: file.name,
        fileContent: fileData.content,
        isBase64: fileData.isBase64
      });

      setParseResult(res);
      setTransactions(res.transactions || []);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Falha ao analisar o arquivo. Verifique o formato do extrato.');
    } finally {
      setParsing(false);
    }
  };

  // Toggle transaction selection
  const toggleSelect = (id) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const toggleSelectAll = (select) => {
    setTransactions((prev) =>
      prev.map((t) => ({ ...t, selected: select }))
    );
  };

  // Change category of an item in preview
  const handleChangeCategory = (id, newCatId) => {
    const cat = categories.find((c) => c.id === newCatId);
    setTransactions((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              categoryId: newCatId,
              categoryName: cat?.name || t.categoryName,
              categoryIcon: cat?.icon || t.categoryIcon
            }
          : t
      )
    );
  };

  // Handle final confirmation
  const handleConfirmImport = async () => {
    const selectedTxs = transactions.filter((t) => t.selected);
    if (selectedTxs.length === 0) {
      setError('Selecione pelo menos um lançamento para importar.');
      return;
    }

    setImporting(true);
    setError('');

    try {
      const res = await apiClient.confirmStatementImport({
        accountId: selectedAccountId,
        transactions: selectedTxs
      });

      setImportSummary(res);
      setStep(3);
      confetti({ particleCount: 70, spread: 60, origin: { y: 0.7 } });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Erro ao importar lançamentos.');
    } finally {
      setImporting(false);
    }
  };

  const fmtBRL = (val) => (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDateBR = (isoDate) => {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return isoDate;
  };

  // Selected counts
  const selectedCount = transactions.filter((t) => t.selected).length;
  const selectedTotalIncome = transactions
    .filter((t) => t.selected && t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const selectedTotalExpense = transactions
    .filter((t) => t.selected && t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  // Filtered transactions
  const displayedTransactions = transactions.filter((t) => {
    if (activeFilter === 'expense') return t.type === 'expense';
    if (activeFilter === 'income') return t.type === 'income';
    if (activeFilter === 'duplicates') return t.isDuplicate;
    return true;
  });

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-white animate-in slide-in-from-bottom-5 duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Importar Extrato Bancário</span>
                <span className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                  {step === 1 ? 'Passo 1/2' : step === 2 ? 'Passo 2/2' : 'Concluído'}
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                {step === 1 && 'Envie o arquivo OFX, CSV ou Excel do seu banco'}
                {step === 2 && 'Revise as transações antes de salvar na sua conta'}
                {step === 3 && 'Lançamentos importados com sucesso!'}
              </p>
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
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {error && (
            <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in">
              <AlertTriangle size={16} className="shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: UPLOAD & ACCOUNT SELECT */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Mandatory Account Selection */}
              <div>
                <label className="text-xs font-bold text-white flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span>1. Conta Bancária do Extrato</span>
                    <span className="text-[10px] text-rose-400 font-extrabold uppercase px-1.5 py-0.2 rounded-md bg-rose-500/10 border border-rose-500/20">
                      Obrigatório
                    </span>
                  </span>
                  {selectedAccount && (
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Saldo: {fmtBRL(selectedAccount.current_balance)}
                    </span>
                  )}
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => {
                    setSelectedAccountId(e.target.value);
                    if (error && e.target.value) setError('');
                  }}
                  className={`w-full px-3.5 py-3 rounded-2xl bg-slate-800 border text-xs text-white focus:outline-none transition-all ${
                    !selectedAccountId
                      ? 'border-amber-500/80 ring-1 ring-amber-500/40 text-amber-200'
                      : 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                  }`}
                  required
                >
                  <option value="">-- Selecione obrigatoriamente a conta bancária --</option>
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.institution}) - Saldo atual: {fmtBRL(acc.current_balance)}
                    </option>
                  ))}
                </select>
                {!selectedAccountId ? (
                  <span className="text-[10px] text-amber-400 flex items-center gap-1 mt-1.5 font-medium">
                    <span>⚠️</span> Selecione a conta (ex: Nubank, Inter, Dinheiro) para onde os lançamentos e saldo serão vinculados.
                  </span>
                ) : (
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1.5 font-medium">
                    <span>✓</span> Extrato será vinculado e atualizará o saldo de: <strong>{selectedAccount.name}</strong>
                  </span>
                )}
              </div>

              {/* Dropzone */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  2. Arquivo do Extrato (.OFX, .CSV ou .XLSX)
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : file
                      ? 'border-emerald-500/50 bg-slate-800/80'
                      : 'border-slate-700 bg-slate-800/40 hover:bg-slate-800/70 hover:border-slate-600'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".ofx,.csv,.xlsx,.xls"
                    className="hidden"
                  />

                  {file ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                        <FileText size={24} />
                      </div>
                      <span className="text-xs font-bold text-white break-all">{file.name}</span>
                      <span className="text-[10px] text-slate-400">
                        {(file.size / 1024).toFixed(1)} KB • Clique para trocar de arquivo
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-white/5 text-slate-300 flex items-center justify-center border border-white/10">
                        <UploadCloud size={24} className="text-emerald-400" />
                      </div>
                      <span className="text-xs font-bold text-slate-200">
                        Clique para escolher o extrato ou arraste aqui
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Formatos aceitos: <strong>OFX</strong> (Recomendado), <strong>CSV</strong> ou <strong>Excel</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Format explanation pill */}
              <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
                <Info size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-white block mb-0.5">Dica sobre o formato OFX:</span>
                  <span>
                    O formato <strong>OFX</strong> é o padrão bancário brasileiro oficial. É o mais preciso, pois já traz data, valor exato e identificador de cada transação sem erros de formatação.
                  </span>
                </div>
              </div>

              {/* Instructions Accordion */}
              <div className="rounded-2xl border border-slate-800 bg-slate-800/30 overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => setShowTips(!showTips)}
                  className="w-full px-3.5 py-2.5 flex items-center justify-between text-slate-300 hover:text-white"
                >
                  <span className="font-medium text-[11px] flex items-center gap-1.5">
                    <span>💡</span> Como baixar o extrato no meu banco?
                  </span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${showTips ? 'rotate-180' : ''}`}
                  />
                </button>

                {showTips && (
                  <div className="px-3.5 pb-3 text-[11px] text-slate-400 space-y-2 border-t border-slate-800/60 pt-2">
                    <div>
                      <strong className="text-purple-300 block">🟣 Nubank:</strong>
                      Abra o app do Nubank &gt; Toque no saldo da Conta &gt; Toque em <em>"Pedir extrato"</em> &gt; Selecione o mês desejado &gt; Escolha formato <strong>OFX</strong> ou <strong>CSV</strong>. Você receberá o arquivo por e-mail em segundos.
                    </div>
                    <div>
                      <strong className="text-orange-300 block">🟠 Banco Inter:</strong>
                      No app ou Internet Banking &gt; Extrato &gt; Toque no ícone de exportar/compartilhar &gt; Selecione <strong>OFX</strong>.
                    </div>
                    <div>
                      <strong className="text-blue-300 block">🔵 Itaú, Bradesco, Santander, Caixa, BB:</strong>
                      Acesse pelo Internet Banking ou app &gt; Extrato &gt; Opção <em>"Salvar / Exportar"</em> &gt; Escolha <strong>OFX (Money/Quicken)</strong> ou <strong>CSV</strong>.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & REVIEW */}
          {step === 2 && parseResult && (
            <div className="space-y-3">
              
              {/* Mandatory Account Target Banner */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🏦</span>
                  <div>
                    <span className="text-[10px] text-emerald-300 font-extrabold uppercase tracking-wider block">
                      Conta Vinculada (Obrigatória):
                    </span>
                    <span className="font-bold text-white text-xs">
                      {selectedAccount?.name || parseResult.accountInfo?.name} ({selectedAccount?.institution || parseResult.accountInfo?.institution})
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Saldo Atual:</span>
                  <span className="font-extrabold text-white text-xs">
                    {fmtBRL(selectedAccount?.current_balance ?? parseResult.accountInfo?.current_balance)}
                  </span>
                </div>
              </div>

              {/* Financial Summary Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Origem do Arquivo:</span>
                  <span className="font-bold text-emerald-400">{parseResult.bankName} ({parseResult.fileType})</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-700/60">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Receitas Selecionadas</span>
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <ArrowUpRight size={12} /> {fmtBRL(selectedTotalIncome)}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Despesas Selecionadas</span>
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1">
                      <ArrowDownRight size={12} /> {fmtBRL(selectedTotalExpense)}
                    </span>
                  </div>
                </div>

                {parseResult.summary.duplicateCount > 0 && (
                  <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>
                      <strong>{parseResult.summary.duplicateCount}</strong> duplicata(s) detectada(s) e desmarcada(s) automaticamente para evitar repetição.
                    </span>
                  </div>
                )}
              </div>

              {/* Filters & Mass Selection */}
              <div className="flex items-center justify-between gap-2 text-xs pt-1">
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                  <button
                    type="button"
                    onClick={() => setActiveFilter('all')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                      activeFilter === 'all' ? 'bg-white text-slate-900 font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Todas ({transactions.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('expense')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                      activeFilter === 'expense' ? 'bg-rose-500 text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Despesas ({transactions.filter((t) => t.type === 'expense').length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFilter('income')}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                      activeFilter === 'income' ? 'bg-emerald-500 text-white font-bold' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Receitas ({transactions.filter((t) => t.type === 'income').length})
                  </button>
                  {parseResult.summary.duplicateCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveFilter('duplicates')}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-colors ${
                        activeFilter === 'duplicates' ? 'bg-amber-500 text-slate-900 font-bold' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Duplicadas ({parseResult.summary.duplicateCount})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 text-[11px]">
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(true)}
                    className="text-emerald-400 hover:underline"
                  >
                    Marcar todas
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectAll(false)}
                    className="text-slate-400 hover:underline"
                  >
                    Desmarcar
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
                {displayedTransactions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    Nenhum lançamento corresponde ao filtro selecionado.
                  </div>
                ) : (
                  displayedTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      onClick={() => toggleSelect(tx.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                        tx.selected
                          ? 'bg-slate-800/90 border-slate-700 shadow-xs'
                          : 'bg-slate-900/50 border-slate-800/60 opacity-60'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={tx.selected}
                        onChange={() => toggleSelect(tx.id)}
                        className="mt-1 h-4 w-4 rounded-md border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs text-white truncate">
                            {tx.description}
                          </span>
                          <span
                            className={`font-extrabold text-xs whitespace-nowrap ${
                              tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'} {fmtBRL(tx.amount)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px]">
                          <span className="text-slate-400">{formatDateBR(tx.date)}</span>

                          {/* Category Selector Dropdown */}
                          <div onClick={(e) => e.stopPropagation()}>
                            <select
                              value={tx.categoryId || ''}
                              onChange={(e) => handleChangeCategory(tx.id, e.target.value)}
                              className="px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-700 text-[10px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                              {categories
                                .filter((c) => c.type === tx.type)
                                .map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.icon} {c.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>

                        {/* Duplicate Alert */}
                        {tx.isDuplicate && (
                          <div className="mt-1 text-[10px] text-amber-400 flex items-center gap-1">
                            <span>⚠️</span> Já existente no banco de dados
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 3 && importSummary && (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Importação Concluída!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  <strong>{importSummary.importedCount}</strong> lançamentos foram salvos na conta{' '}
                  <strong className="text-emerald-400">{importSummary.accountName}</strong>.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 max-w-xs mx-auto text-xs space-y-2 text-left">
                <div className="flex justify-between text-slate-400">
                  <span>Receitas adicionadas:</span>
                  <span className="text-emerald-400 font-bold">+{fmtBRL(importSummary.totalIncome)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Despesas adicionadas:</span>
                  <span className="text-rose-400 font-bold">-{fmtBRL(importSummary.totalExpense)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-700 font-bold">
                  <span>Novo Saldo da Conta:</span>
                  <span className="text-white">{fmtBRL(importSummary.newBalance)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
          {step === 1 && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!selectedAccountId || !file || parsing}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30"
              >
                {parsing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Analisando arquivo...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Analisar Extrato
                  </>
                )}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-3.5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={selectedCount === 0 || importing}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30"
              >
                {importing ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Importando...
                  </>
                ) : (
                  <>
                    <Check size={14} /> Importar {selectedCount} {selectedCount === 1 ? 'Lançamento' : 'Lançamentos'}
                  </>
                )}
              </button>
            </>
          )}

          {step === 3 && (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-900/30"
            >
              Concluir e Ver Saldo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
