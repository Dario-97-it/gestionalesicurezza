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

// Token management
let accessToken: string | null = localStorage.getItem('accessToken');

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Try to refresh token
      try {
        const refreshResponse = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        if (refreshResponse.data.accessToken) {
          accessToken = refreshResponse.data.accessToken;
          localStorage.setItem('accessToken', accessToken!);
          // Retry original request
          if (error.config) {
            error.config.headers.Authorization = `Bearer ${accessToken}`;
            return api.request(error.config);
          }
        }
      } catch {
        // Refresh failed, clear tokens and redirect to login
        accessToken = null;
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Set access token
export const setAccessToken = (token: string | null) => {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
};

// Auth API
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: User; client: Client; accessToken: string }> => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
    }
    return response.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    setAccessToken(null);
  },

  me: async (): Promise<{ user: User; client: Client }> => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    const response = await api.post('/auth/refresh');
    if (response.data.accessToken) {
      setAccessToken(response.data.accessToken);
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

  getByEdition: async (editionId: number, date?: string): Promise<Attendance[]> => {
    const params = new URLSearchParams({ editionId: String(editionId) });
    if (date) params.append('date', date);
    const response = await api.get(`/attendances?${params}`);
    return response.data.data || response.data;
  },

  create: async (data: Partial<Attendance>): Promise<Attendance> => {
    const response = await api.post('/attendances', data);
    return response.data;
  },

  update: async (id: number, data: Partial<Attendance>): Promise<Attendance> => {
    const response = await api.put(`/attendances/${id}`, data);
    return response.data;
  },

  upsert: async (data: { courseEditionId: number; studentId: number; registrationId: number; date: string; present: boolean }): Promise<Attendance> => {
    const response = await api.post('/attendances/upsert', data);
    return response.data;
  },

  markAll: async (editionId: number, date: string, present: boolean): Promise<void> => {
    await api.post('/attendances/mark-all', { editionId, date, present });
  },

  bulkCreate: async (data: Partial<Attendance>[]): Promise<Attendance[]> => {
    const response = await api.post('/attendances/bulk', { attendances: data });
    return response.data;
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
