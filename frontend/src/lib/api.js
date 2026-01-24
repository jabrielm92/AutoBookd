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
export const startSystem = () => api.post('/system/start');
export const stopSystem = () => api.post('/system/stop');

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
