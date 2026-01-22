// User Types
export interface User {
  id: number;
  clientId: number;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'readonly';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface Client {
  id: number;
  email: string;
  name: string;
  plan: 'trial' | 'basic' | 'pro' | 'enterprise';
  subscriptionStatus: 'active' | 'suspended' | 'expired' | 'trial';
  subscriptionExpiresAt?: string;
  maxUsers: number;
}

export interface AuthState {
  user: User | null;
  client: Client | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Company Types
export interface Company {
  id: number;
  clientId: number;
  name: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
  createdAt: string;
  updatedAt: string;
}

// Student Types
export interface Student {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  fiscalCode?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  companyId?: number;
  company?: Company;
  createdAt: string;
  updatedAt: string;
}

// Instructor Types
export interface Instructor {
  id: number;
  clientId: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  specialization?: string;
  hourlyRate?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Course Types
export interface Course {
  id: number;
  clientId: number;
  title: string;
  code: string;
  type: string;
  durationHours: number;
  defaultPrice: number;
  description?: string;
  certificateValidityMonths?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Course Edition Types
export interface CourseEdition {
  id: number;
  clientId: number;
  courseId: number;
  course?: Course;
  startDate: string;
  endDate: string;
  location: string;
  instructorId?: number;
  instructor?: Instructor;
  maxParticipants: number;
  price: number;
  customPrice?: number;
  dedicatedCompanyId?: number;
  dedicatedCompany?: Company;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  registrationsCount?: number;
}

// Registration Types
export interface Registration {
  id: number;
  clientId: number;
  studentId: number;
  student?: Student;
  courseEditionId: number;
  courseEdition?: CourseEdition;
  companyId?: number;
  company?: Company;
  registrationDate: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  priceApplied: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Attendance Types
export interface Attendance {
  id: number;
  clientId: number;
  registrationId: number;
  registration?: Registration;
  studentId: number;
  student?: Student;
  courseEditionId: number;
  courseEdition?: CourseEdition;
  attendanceDate: string;
  date?: string;
  status: 'present' | 'absent' | 'late' | 'justified';
  present: boolean;
  hoursAttended?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalCompanies: number;
  totalStudents: number;
  totalCourses: number;
  activeEditions: number;
  totalRegistrations: number;
  upcomingEditions: CourseEdition[];
  recentRegistrations: Registration[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface CompanyForm {
  name: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
}

export interface StudentForm {
  firstName: string;
  lastName: string;
  fiscalCode?: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  birthPlace?: string;
  address?: string;
  companyId?: number;
}

export interface CourseForm {
  title: string;
  code: string;
  type: string;
  durationHours: number;
  defaultPrice: number;
  description?: string;
  certificateValidityMonths?: number;
  isActive: boolean;
}

export interface CourseEditionForm {
  courseId: number;
  startDate: string;
  endDate: string;
  location: string;
  instructorId?: number;
  maxParticipants: number;
  price: number;
  dedicatedCompanyId?: number;
}

export interface RegistrationForm {
  studentId: number;
  courseEditionId: number;
  companyId?: number;
  priceApplied: number;
  notes?: string;
}

export interface InstructorForm {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  specialization?: string;
  hourlyRate?: number;
  notes?: string;
}
