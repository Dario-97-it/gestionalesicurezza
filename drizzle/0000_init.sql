-- SecurityTools Database Schema for Cloudflare D1
-- Versione: 1.0.0
-- Data: Gennaio 2026

-- Clients table - I TUOI clienti che pagano per usare il software
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'trial' NOT NULL CHECK (plan IN ('trial', 'basic', 'pro', 'enterprise')),
  subscriptionStatus TEXT DEFAULT 'trial' NOT NULL CHECK (subscriptionStatus IN ('active', 'suspended', 'expired', 'trial')),
  subscriptionExpiresAt TEXT,
  maxUsers INTEGER DEFAULT 5 NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastLoginAt TEXT
);

-- Users table - Utenti del gestionale (dipendenti del cliente)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'user', 'readonly')),
  isActive INTEGER DEFAULT 1 NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastLoginAt TEXT,
  UNIQUE(clientId, email)
);
CREATE INDEX IF NOT EXISTS user_clientId_idx ON users(clientId);

-- Companies table - Aziende gestite DAL cliente nel suo gestionale
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  vatNumber TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  contactPerson TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(clientId, vatNumber)
);
CREATE INDEX IF NOT EXISTS company_clientId_idx ON companies(clientId);

-- Instructors table - Docenti che tengono i corsi
CREATE TABLE IF NOT EXISTS instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  specialization TEXT,
  hourlyRate INTEGER,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS instructor_clientId_idx ON instructors(clientId);

-- Students table - Studenti iscritti ai corsi
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  fiscalCode TEXT,
  email TEXT,
  phone TEXT,
  birthDate TEXT,
  birthPlace TEXT,
  address TEXT,
  companyId INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(clientId, fiscalCode)
);
CREATE INDEX IF NOT EXISTS student_clientId_idx ON students(clientId);
CREATE INDEX IF NOT EXISTS student_companyId_idx ON students(companyId);

-- Courses table - Catalogo corsi disponibili (template)
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  durationHours INTEGER NOT NULL,
  defaultPrice INTEGER NOT NULL,
  description TEXT,
  certificateValidityMonths INTEGER,
  isActive INTEGER DEFAULT 1 NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(clientId, code)
);
CREATE INDEX IF NOT EXISTS course_clientId_idx ON courses(clientId);

-- Course Editions table - Edizioni specifiche dei corsi
CREATE TABLE IF NOT EXISTS courseEditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  courseId INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  location TEXT NOT NULL,
  instructorId INTEGER REFERENCES instructors(id) ON DELETE SET NULL,
  maxParticipants INTEGER NOT NULL,
  price INTEGER NOT NULL,
  customPrice INTEGER,
  dedicatedCompanyId INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  instructor TEXT,
  status TEXT DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'ongoing', 'completed', 'cancelled')),
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS edition_clientId_idx ON courseEditions(clientId);
CREATE INDEX IF NOT EXISTS edition_courseId_idx ON courseEditions(courseId);
CREATE INDEX IF NOT EXISTS edition_startDate_idx ON courseEditions(startDate);
CREATE INDEX IF NOT EXISTS edition_status_idx ON courseEditions(status);

-- Registrations table - Iscrizioni studenti alle edizioni corsi
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  studentId INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  courseEditionId INTEGER NOT NULL REFERENCES courseEditions(id) ON DELETE CASCADE,
  companyId INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  registrationDate TEXT NOT NULL,
  status TEXT DEFAULT 'confirmed' NOT NULL CHECK (status IN ('confirmed', 'pending', 'cancelled')),
  priceApplied INTEGER NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(studentId, courseEditionId)
);
CREATE INDEX IF NOT EXISTS registration_clientId_idx ON registrations(clientId);
CREATE INDEX IF NOT EXISTS registration_studentId_idx ON registrations(studentId);
CREATE INDEX IF NOT EXISTS registration_courseEditionId_idx ON registrations(courseEditionId);

-- Attendances table - Presenze giornaliere studenti alle lezioni
CREATE TABLE IF NOT EXISTS attendances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  registrationId INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  studentId INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  courseEditionId INTEGER NOT NULL REFERENCES courseEditions(id) ON DELETE CASCADE,
  attendanceDate TEXT NOT NULL,
  status TEXT DEFAULT 'present' NOT NULL CHECK (status IN ('present', 'absent', 'late', 'justified')),
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(registrationId, attendanceDate)
);
CREATE INDEX IF NOT EXISTS attendance_clientId_idx ON attendances(clientId);
CREATE INDEX IF NOT EXISTS attendance_registrationId_idx ON attendances(registrationId);
CREATE INDEX IF NOT EXISTS attendance_attendanceDate_idx ON attendances(attendanceDate);

-- Invoices table - Log fatture generate
CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  courseEditionId INTEGER NOT NULL REFERENCES courseEditions(id) ON DELETE CASCADE,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  externalInvoiceId TEXT,
  invoiceNumber TEXT,
  invoiceDate TEXT NOT NULL,
  amount INTEGER NOT NULL,
  studentsCount INTEGER NOT NULL,
  status TEXT DEFAULT 'sent' NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'cancelled')),
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS invoice_clientId_idx ON invoices(clientId);
CREATE INDEX IF NOT EXISTS invoice_courseEditionId_idx ON invoices(courseEditionId);
CREATE INDEX IF NOT EXISTS invoice_companyId_idx ON invoices(companyId);

-- Audit Log table - Log delle azioni per compliance e sicurezza
CREATE TABLE IF NOT EXISTS auditLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  userId INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resourceType TEXT NOT NULL,
  resourceId INTEGER,
  details TEXT,
  ipAddress TEXT,
  userAgent TEXT,
  createdAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_clientId_idx ON auditLog(clientId);
CREATE INDEX IF NOT EXISTS audit_userId_idx ON auditLog(userId);
CREATE INDEX IF NOT EXISTS audit_action_idx ON auditLog(action);
CREATE INDEX IF NOT EXISTS audit_createdAt_idx ON auditLog(createdAt);
