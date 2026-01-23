import axios, { AxiosError, AxiosInstance } from 'axios';
import type { 
  User, 
  Client, 
  Company, 
  Student, 
  Course, 
  CourseEdition, 
  Registration, 
  Attendance,
  Instructor,
  DashboardStats,
  PaginatedResponse
} from '../types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Token management - SEMPRE leggi da localStorage per evitare problemi di sincronizzazione
const getAccessToken = (): string | null => localStorage.getItem('accessToken');
const getRefreshToken = (): string | null => localStorage.getItem('refreshToken');

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

// Request interceptor to add auth token - SEMPRE leggi da localStorage
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    
    // Se è un 401 e non è già un retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Se stiamo già facendo il refresh, metti in coda
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const currentRefreshToken = getRefreshToken();
      
      // Se non abbiamo un refresh token, vai al login
      if (!currentRefreshToken) {
        isRefreshing = false;
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        // Chiama refresh con il refreshToken nel body
        const response = await axios.post('/api/auth/refresh', 
          { refreshToken: currentRefreshToken },
          { withCredentials: true }
        );
        
        const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;
        
        // Salva i nuovi token
        setTokens(newAccessToken, newRefreshToken);
        
        // Processa la coda di richieste fallite
        processQueue(null, newAccessToken);
        
        // Riprova la richiesta originale
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // Refresh fallito, pulisci e vai al login
        processQueue(refreshError, null);
        clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);

// Set tokens - salva in localStorage
export const setTokens = (newAccessToken: string | null, newRefreshToken?: string | null) => {
  if (newAccessToken) {
    localStorage.setItem('accessToken', newAccessToken);
  } else {
    localStorage.removeItem('accessToken');
  }
  
  if (newRefreshToken !== undefined) {
    if (newRefreshToken) {
      localStorage.setItem('refreshToken', newRefreshToken);
    } else {
      localStorage.removeItem('refreshToken');
    }
  }
};

// Clear tokens
export const clearTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
};

// Legacy function for backward compatibility
export const setAccessToken = (token: string | null) => {
  setTokens(token);
};

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; client: Client; accessToken: string; refreshToken: string }> => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      // Salva sia accessToken che refreshToken
      setTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response.data;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignora errori di logout
    }
    clearTokens();
  },

  me: async (): Promise<{ user: User; client: Client }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refresh: async (): Promise<{ accessToken: string; refreshToken: string }> => {
    const currentRefreshToken = getRefreshToken();
    const response = await axios.post('/api/auth/refresh', 
      { refreshToken: currentRefreshToken },
      { withCredentials: true }
    );
    if (response.data.accessToken) {
      setTokens(response.data.accessToken, response.data.refreshToken);
    }
    return response.data;
  },
};

// Dashboard API
export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await api.get('/dashboard');
    return response.data;
  },
};

// Companies API
export const companiesApi = {
  getAll: async (page = 1, pageSize = 20, search?: string): Promise<PaginatedResponse<Company>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    const response = await api.get(`/companies?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Company> => {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },

  create: async (data: Partial<Company>): Promise<Company> => {
    const response = await api.post('/companies', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Company>): Promise<Company> => {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },
};

// Students API
export const studentsApi = {
  getAll: async (page = 1, pageSize = 20, search?: string, companyId?: number): Promise<PaginatedResponse<Student>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    if (companyId) params.append('companyId', String(companyId));
    const response = await api.get(`/students?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Student> => {
    const response = await api.get(`/students/${id}`);
    return response.data;
  },

  create: async (data: Partial<Student>): Promise<Student> => {
    const response = await api.post('/students', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Student>): Promise<Student> => {
    const response = await api.put(`/students/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/students/${id}`);
  },
};

// Courses API
export const coursesApi = {
  getAll: async (page = 1, pageSize = 20, search?: string): Promise<PaginatedResponse<Course>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    const response = await api.get(`/courses?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Course> => {
    const response = await api.get(`/courses/${id}`);
    return response.data;
  },

  create: async (data: Partial<Course>): Promise<Course> => {
    const response = await api.post('/courses', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Course>): Promise<Course> => {
    const response = await api.put(`/courses/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/courses/${id}`);
  },
};

// Course Editions API
export const editionsApi = {
  getAll: async (page = 1, pageSize = 20, status?: string, courseId?: number): Promise<PaginatedResponse<CourseEdition>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status) params.append('status', status);
    if (courseId) params.append('courseId', String(courseId));
    const response = await api.get(`/editions?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<CourseEdition> => {
    const response = await api.get(`/editions/${id}`);
    return response.data;
  },

  create: async (data: Partial<CourseEdition>): Promise<CourseEdition> => {
    const response = await api.post('/editions', data);
    return response.data;
  },

  update: async (id: number, data: Partial<CourseEdition>): Promise<CourseEdition> => {
    const response = await api.put(`/editions/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/editions/${id}`);
  },
};

// Registrations API
export const registrationsApi = {
  getAll: async (page = 1, pageSize = 20, editionId?: number, studentId?: number): Promise<PaginatedResponse<Registration>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (editionId) params.append('editionId', String(editionId));
    if (studentId) params.append('studentId', String(studentId));
    const response = await api.get(`/registrations?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Registration> => {
    const response = await api.get(`/registrations/${id}`);
    return response.data;
  },

  create: async (data: Partial<Registration>): Promise<Registration> => {
    const response = await api.post('/registrations', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Registration>): Promise<Registration> => {
    const response = await api.put(`/registrations/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/registrations/${id}`);
  },
};

// Attendances API
export const attendancesApi = {
  getAll: async (page = 1, pageSize = 20, editionId?: number, date?: string): Promise<PaginatedResponse<Attendance>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (editionId) params.append('editionId', String(editionId));
    if (date) params.append('date', date);
    const response = await api.get(`/attendances?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Attendance> => {
    const response = await api.get(`/attendances/${id}`);
    return response.data;
  },

  create: async (data: Partial<Attendance>): Promise<Attendance> => {
    const response = await api.post('/attendances', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Attendance>): Promise<Attendance> => {
    const response = await api.put(`/attendances/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/attendances/${id}`);
  },

  bulkCreate: async (data: Partial<Attendance>[]): Promise<Attendance[]> => {
    const response = await api.post('/attendances/bulk', { attendances: data });
    return response.data;
  },

  getByEdition: async (editionId: number, date?: string): Promise<Attendance[]> => {
    const params = new URLSearchParams({ editionId: String(editionId) });
    if (date) params.append('date', date);
    const response = await api.get(`/attendances?${params}`);
    return response.data.data || response.data || [];
  },

  upsert: async (data: { courseEditionId: number; studentId: number; registrationId: number; date: string; present: boolean }): Promise<Attendance> => {
    const response = await api.post('/attendances/upsert', data);
    return response.data;
  },

  markAll: async (editionId: number, date: string, present: boolean): Promise<void> => {
    await api.post('/attendances/mark-all', { editionId, date, present });
  },
};

// Instructors API
export const instructorsApi = {
  getAll: async (page = 1, pageSize = 20, search?: string): Promise<PaginatedResponse<Instructor>> => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search) params.append('search', search);
    const response = await api.get(`/instructors?${params}`);
    return response.data;
  },

  getById: async (id: number): Promise<Instructor> => {
    const response = await api.get(`/instructors/${id}`);
    return response.data;
  },

  create: async (data: Partial<Instructor>): Promise<Instructor> => {
    const response = await api.post('/instructors', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Instructor>): Promise<Instructor> => {
    const response = await api.put(`/instructors/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/instructors/${id}`);
  },
};

export default api;
