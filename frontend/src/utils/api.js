import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

const api = {
  // Profiles
  getProfiles: () => axios.get(`${API_BASE}/profiles`).then(r => r.data),
  getProfile: (id) => axios.get(`${API_BASE}/profiles/${id}`).then(r => r.data),
  grantConsent: (id) => axios.post(`${API_BASE}/profiles/${id}/consent`).then(r => r.data),
  getEvaluation: (id) => axios.get(`${API_BASE}/profiles/${id}/evaluation`).then(r => r.data),
  
  // Simulations & What-If
  simulateUpdate: (id, type, payload) => axios.post(`${API_BASE}/profiles/${id}/simulate-update`, { type, payload }).then(r => r.data),
  runWhatIf: (id, modifications) => axios.post(`${API_BASE}/profiles/${id}/whatif`, { modifications }).then(r => r.data),
  getForecast: (id) => axios.get(`${API_BASE}/profiles/${id}/forecast`).then(r => r.data),
  getAuditLogs: (id) => axios.get(`${API_BASE}/profiles/${id}/audit-logs`).then(r => r.data),

  // Loans
  applyLoan: (id, requestedAmount, purpose) => axios.post(`${API_BASE}/profiles/${id}/apply`, { requestedAmount, purpose }).then(r => r.data),
  getLoans: () => axios.get(`${API_BASE}/loans`).then(r => r.data),
  makeDecision: (loanId, status, remarks, approvedAmount) => axios.post(`${API_BASE}/loans/${loanId}/decision`, { status, remarks, approvedAmount }).then(r => r.data)
};

export default api;
