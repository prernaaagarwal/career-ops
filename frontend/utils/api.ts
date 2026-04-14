import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (email: string, password: string, full_name: string) =>
    api.post('/api/auth/register', { email, password, full_name }),
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  verify: () => api.post('/api/auth/verify'),
};

// Onboarding API
export const onboardingAPI = {
  getStatus: () => api.get('/api/onboarding/status'),
  uploadCV: (cv_markdown: string, cv_json?: string) =>
    api.post('/api/onboarding/cv', { cv_markdown, cv_json }),
  saveCv: (cv_markdown: string, cv_json?: string) =>
    api.post('/api/onboarding/cv', { cv_markdown, cv_json }),
  saveProfile: (data: any) => api.post('/api/onboarding/profile', data),
  saveArticleDigest: (article_digest: string) =>
    api.post('/api/onboarding/article-digest', { article_digest }),
  complete: () => api.post('/api/onboarding/complete'),
};

// Candidates API
export const candidatesAPI = {
  getProfile: () => api.get('/api/candidates/profile'),
  updateProfile: (data: any) => api.put('/api/candidates/profile', data),
  getCV: () => api.get('/api/candidates/cv'),
  getCv: () => api.get('/api/candidates/cv'),
  updateCV: (cv_markdown: string, cv_json?: string) =>
    api.put('/api/candidates/cv', { cv_markdown, cv_json }),
  updateCv: (cv_markdown: string, cv_json?: string) =>
    api.put('/api/candidates/cv', { cv_markdown, cv_json }),
};

// Applications API
export const applicationsAPI = {
  getAll: (skip = 0, limit = 50, filters?: any) =>
    api.get('/api/applications', { params: { skip, limit, ...filters } }),
  getStats: () => api.get('/api/applications/stats'),
  get: (id: number) => api.get(`/api/applications/${id}`),
  getOne: (id: number) => api.get(`/api/applications/${id}`),
  create: (data: any) => api.post('/api/applications', data),
  update: (id: number, data: any) => api.patch(`/api/applications/${id}`, data),
  delete: (id: number) => api.delete(`/api/applications/${id}`),
};

// Reports API
export const reportsAPI = {
  getAll: (skip = 0, limit = 20) =>
    api.get('/api/reports', { params: { skip, limit } }),
  get: (id: number) => api.get(`/api/reports/${id}`),
  getOne: (id: number) => api.get(`/api/reports/${id}`),
  getByNum: (num: number) => api.get(`/api/reports/num/${num}`),
  create: (data: any) => api.post('/api/reports', data),
  update: (id: number, data: any) => api.patch(`/api/reports/${id}`, data),
  getPDFPath: (id: number) => api.get(`/api/reports/${id}/pdf`),
};

// Evaluations API
export const evaluationsAPI = {
  evaluate: (data: { url?: string; jd_text?: string }) =>
    api.post('/api/evaluate', data),
  getStatus: (id: string) => api.get(`/api/evaluate/status/${id}`),
};

// Scanner API
export const scannerAPI = {
  scan: () => api.post('/api/scan'),
  getStatus: (id: string) => api.get(`/api/scan/status/${id}`),
  getJobs: (filters?: any) =>
    api.get('/api/scan/jobs', { params: filters || {} }),
  addToPipeline: (jobId: number) =>
    api.post(`/api/scan/jobs/${jobId}/add-to-pipeline`),
};

// Story Bank API
export const storyBankAPI = {
  getAll: (skip = 0, limit = 50, tag?: string) =>
    api.get('/api/story-bank', { params: { skip, limit, tag } }),
  get: (id: number) => api.get(`/api/story-bank/${id}`),
  create: (data: any) => api.post('/api/story-bank', data),
  update: (id: number, data: any) => api.patch(`/api/story-bank/${id}`, data),
  delete: (id: number) => api.delete(`/api/story-bank/${id}`),
};

// Interview Prep API
export const interviewPrepAPI = {
  get: (companySlug: string) => api.get(`/api/interview-prep/${companySlug}`),
  getPrep: (companySlug: string) => api.get(`/api/interview-prep/${companySlug}`),
  save: (companySlug: string, data: any) =>
    api.post(`/api/interview-prep/${companySlug}`, data),
};

// Follow-ups API
export const followUpsAPI = {
  getAll: (filters?: any) =>
    api.get('/api/follow-ups', { params: filters || {} }),
  create: (data: any) => api.post('/api/follow-ups', data),
  update: (id: number, data: any) => api.patch(`/api/follow-ups/${id}`, data),
  delete: (id: number) => api.delete(`/api/follow-ups/${id}`),
};
