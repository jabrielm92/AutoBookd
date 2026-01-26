import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// System
export const getConfig = () => api.get('/config');
export const updateConfig = (data) => api.put('/config', data);
export const startSystem = (testMode = false) => api.post(`/system/start?test_mode=${testMode}`);
export const stopSystem = () => api.post('/system/stop');
export const getSystemStatus = () => api.get('/system/status');

// Scraping
export const getScrapeConfig = () => api.get('/scrape/config');
export const updateScrapeConfig = (data) => api.put('/scrape/config', data);
export const scrapeNow = (keyword, location, limit = 20) => 
  api.post('/scrape/now', null, { params: { keyword, location, limit } });
export const enrichLead = (id) => api.post(`/leads/${id}/enrich`);
export const researchLead = (id) => api.post(`/leads/${id}/research`);

// Pipeline
export const getPipelineAnalytics = () => api.get('/pipeline/analytics');
export const getSequences = (params) => api.get('/sequences', { params });
export const pauseSequence = (id) => api.post(`/sequences/${id}/pause`);
export const resumeSequence = (id) => api.post(`/sequences/${id}/resume`);

// LinkedIn Import
export const importLinkedInLead = (data) => api.post('/leads/import/linkedin', data);

// Discovery
export const getDiscoveryConfig = () => api.get('/discovery/config');
export const updateDiscoveryConfig = (data) => api.put('/discovery/config', data);
export const runDiscoveryNow = () => api.post('/discovery/run-now');
export const getDiscoveryStats = () => api.get('/discovery/stats');
export const getDiscoverySources = () => api.get('/discovery/sources');

// Leads
export const getLeads = (params) => api.get('/leads', { params });
export const getLead = (id) => api.get(`/leads/${id}`);
export const createLead = (data) => api.post('/leads', data);
export const bulkCreateLeads = (leads) => api.post('/leads/bulk', { leads });
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const rescoreLead = (id) => api.post(`/leads/${id}/rescore`);

// Conversations
export const getConversations = (params) => api.get('/conversations', { params });
export const getConversation = (leadId) => api.get(`/conversations/${leadId}`);
export const createConversation = (data) => api.post('/conversations', data);

// Niches
export const getNiches = () => api.get('/niches');
export const getNiche = (id) => api.get(`/niches/${id}`);
export const createNiche = (data) => api.post('/niches', data);
export const updateNiche = (id, data) => api.put(`/niches/${id}`, data);
export const deleteNiche = (id) => api.delete(`/niches/${id}`);

// Bookings
export const getBookings = (params) => api.get('/bookings', { params });
export const getBooking = (id) => api.get(`/bookings/${id}`);
export const createBooking = (data) => api.post('/bookings', data);
export const updateBooking = (id, data) => api.put(`/bookings/${id}`, data);

// Queue
export const getPriorityQueue = (limit) => api.get('/queue/priority', { params: { limit } });
export const getStandardQueue = (limit) => api.get('/queue/standard', { params: { limit } });
export const getFollowUpQueue = (limit) => api.get('/queue/follow-up', { params: { limit } });

// Analytics
export const getAnalytics = () => api.get('/analytics');

// Health
export const healthCheck = () => api.get('/health');

export default api;
