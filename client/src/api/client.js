// API Client Wrapper for FinAI
const API_BASE = '/api';

export const apiClient = {
  getToken() {
    return localStorage.getItem('finai_token');
  },

  setToken(token) {
    if (token) {
      localStorage.setItem('finai_token', token);
    } else {
      localStorage.removeItem('finai_token');
    }
  },

  getUser() {
    const raw = localStorage.getItem('finai_user');
    return raw ? JSON.parse(raw) : null;
  },

  setUser(user) {
    if (user) {
      localStorage.setItem('finai_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('finai_user');
    }
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);

    if (response.status === 401) {
      const errData = await response.json().catch(() => ({}));
      // If authenticating, 401 indicates invalid credentials, NOT an expired token
      if (endpoint.startsWith('/auth/')) {
        const err = new Error(errData.error || 'E-mail ou senha incorretos.');
        err.status = 401;
        throw err;
      }

      // Clear token if expired for authenticated endpoints
      this.setToken(null);
      this.setUser(null);
      window.dispatchEvent(new Event('auth_expired'));
      throw new Error(errData.error || 'Sessão expirada. Faça login novamente.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const err = new Error(errData.error || `Erro ${response.status}: ${response.statusText}`);
      err.status = response.status;
      err.requiresVerification = errData.requiresVerification;
      throw err;
    }

    // If downloading a file
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/csv') || contentType.includes('spreadsheetml')) {
      return response.blob();
    }

    return response.json();
  },

  // Auth
  login(email, password) {
    return this.request('/auth/login', { method: 'POST', body: { email, password } });
  },

  register(name, email, password) {
    return this.request('/auth/register', { method: 'POST', body: { name, email, password } });
  },

  verifyCode(email, code) {
    return this.request('/auth/verify-code', { method: 'POST', body: { email, code } });
  },

  resendCode(email) {
    return this.request('/auth/resend-code', { method: 'POST', body: { email } });
  },

  getProfile() {
    return this.request('/auth/me');
  },

  // Assistant & Chat
  getAssistantHistory() {
    return this.request('/assistant/history');
  },

  sendAssistantMessage(message) {
    return this.request('/assistant/chat', { method: 'POST', body: { message } });
  },

  // Dashboard & Reports
  getDashboard(month, year) {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return this.request(`/reports/dashboard${query}`);
  },

  getReports(month, year) {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return this.request(`/reports/monthly${query}`);
  },

  async downloadCSV() {
    const blob = await this.request('/reports/export/csv');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  async downloadExcel() {
    const blob = await this.request('/reports/export/excel');
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financas_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  },

  // Transactions
  getTransactions(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, v);
    });
    return this.request(`/transactions?${params.toString()}`);
  },

  getTransaction(id) {
    return this.request(`/transactions/${id}`);
  },

  createTransaction(data) {
    return this.request('/transactions', { method: 'POST', body: data });
  },

  updateTransaction(id, data) {
    return this.request(`/transactions/${id}`, { method: 'PUT', body: data });
  },

  deleteTransaction(id) {
    return this.request(`/transactions/${id}`, { method: 'DELETE' });
  },

  duplicateTransaction(id) {
    return this.request(`/transactions/${id}/duplicate`, { method: 'POST' });
  },

  // Transfers
  getTransfers() {
    return this.request('/transfers');
  },

  createTransfer(data) {
    return this.request('/transfers', { method: 'POST', body: data });
  },

  // Accounts
  getAccounts() {
    return this.request('/accounts');
  },

  createAccount(data) {
    return this.request('/accounts', { method: 'POST', body: data });
  },

  updateAccount(id, data) {
    return this.request(`/accounts/${id}`, { method: 'PUT', body: data });
  },

  deleteAccount(id) {
    return this.request(`/accounts/${id}`, { method: 'DELETE' });
  },

  // Credit Cards
  getCreditCards() {
    return this.request('/credit-cards');
  },

  createCreditCard(data) {
    return this.request('/credit-cards', { method: 'POST', body: data });
  },

  updateCreditCard(id, data) {
    return this.request(`/credit-cards/${id}`, { method: 'PUT', body: data });
  },

  deleteCreditCard(id) {
    return this.request(`/credit-cards/${id}`, { method: 'DELETE' });
  },

  // Categories
  getCategories(type) {
    const query = type ? `?type=${type}` : '';
    return this.request(`/categories${query}`);
  },

  createCategory(data) {
    return this.request('/categories', { method: 'POST', body: data });
  },

  updateCategory(id, data) {
    return this.request(`/categories/${id}`, { method: 'PUT', body: data });
  },

  deleteCategory(id) {
    return this.request(`/categories/${id}`, { method: 'DELETE' });
  },

  // Budgets
  getBudgets(month, year) {
    const query = month && year ? `?month=${month}&year=${year}` : '';
    return this.request(`/budgets${query}`);
  },

  setBudget(data) {
    return this.request('/budgets', { method: 'POST', body: data });
  },

  // Recurring
  getRecurring() {
    return this.request('/recurring');
  },

  createRecurring(data) {
    return this.request('/recurring', { method: 'POST', body: data });
  },

  cancelRecurring(keyword) {
    return this.request('/recurring/cancel', { method: 'POST', body: { keyword } });
  },

  deleteRecurring(id) {
    return this.request(`/recurring/${id}`, { method: 'DELETE' });
  }
};
