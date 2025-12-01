import axios from 'axios';

const API_URL = import.meta.env.VITE_PORTFOLIO_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const portfolioService = {
  // Get profile
  getProfile: async () => {
    const response = await api.get('/profile');
    return response.data;
  },

  // Get skills
  getSkills: async () => {
    const response = await api.get('/skills');
    return response.data;
  },

  // Get projects
  getProjects: async () => {
    const response = await api.get('/projects');
    return response.data;
  },

  // Send contact message
  sendMessage: async (data: { name: string; email: string; message: string }) => {
    const response = await api.post('/contact', data);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

export default portfolioService;
