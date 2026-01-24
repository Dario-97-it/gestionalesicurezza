-- Inizializzazione Database GestionaleSicurezza 2026
-- Cloudflare D1 SQL Script

-- 1. Tabella Clienti (Abbonati al gestionale)
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  passwordHash TEXT NOT NULL,
  name TEXT NOT NULL,
  contactPerson TEXT,
  phone TEXT,
  plan TEXT DEFAULT 'trial' NOT NULL,
  subscriptionStatus TEXT DEFAULT 'trial' NOT NULL,
  subscriptionExpiresAt TEXT,
  maxUsers INTEGER DEFAULT 5 NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- 2. Tabella Agenti (Pagina 6)
CREATE TABLE IF NOT EXISTS agents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS agent_clientId_idx ON agents(clientId);

-- 3. Tabella Aziende (Pagina 2)
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  name TEXT NOT NULL,
  vatNumber TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  cap TEXT,
  contactPerson TEXT,
  atecoCode TEXT,
  agentId INTEGER,
  uniqueCode TEXT,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  UNIQUE(clientId, vatNumber)
);
CREATE INDEX IF NOT EXISTS company_clientId_idx ON companies(clientId);

-- 4. Tabella Docenti (Pagina 5)
CREATE TABLE IF NOT EXISTS instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  hourlyRate INTEGER,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS instructor_clientId_idx ON instructors(clientId);

-- 5. Tabella Studenti (Pagina 3)
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  fiscalCode TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  birthDate TEXT,
  birthPlace TEXT,
  gender TEXT,
  address TEXT,
  companyId INTEGER,
  jobTitle TEXT,
  atecoCode TEXT,
  agentId INTEGER,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE SET NULL,
  UNIQUE(clientId, fiscalCode)
);
CREATE INDEX IF NOT EXISTS student_clientId_idx ON students(clientId);

-- 6. Tabella Servizi/Corsi (Pagina 4)
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT,
  durationHours INTEGER NOT NULL,
  defaultPrice INTEGER NOT NULL,
  certificateValidityMonths INTEGER NOT NULL,
  description TEXT,
  isActive INTEGER DEFAULT 1 NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS course_clientId_idx ON courses(clientId);

-- 7. Tabella Edizioni (Pagina 7)
CREATE TABLE IF NOT EXISTS courseEditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  courseId INTEGER NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  location TEXT NOT NULL,
  instructorId INTEGER,
  maxParticipants INTEGER NOT NULL,
  minParticipants INTEGER DEFAULT 1,
  price INTEGER NOT NULL,
  status TEXT DEFAULT 'scheduled' NOT NULL,
  isDedicated INTEGER DEFAULT 0,
  dedicatedCompanyId INTEGER,
  notes TEXT,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructorId) REFERENCES instructors(id) ON DELETE SET NULL,
  FOREIGN KEY (dedicatedCompanyId) REFERENCES companies(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS edition_clientId_idx ON courseEditions(clientId);

-- 8. Tabella Iscrizioni (Pagina 9)
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  studentId INTEGER NOT NULL,
  courseEditionId INTEGER NOT NULL,
  companyId INTEGER,
  registrationDate TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  status TEXT DEFAULT 'pending' NOT NULL,
  priceApplied INTEGER NOT NULL,
  notes TEXT,
  invoiceId TEXT,
  invoiceStatus TEXT DEFAULT 'none',
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (courseEditionId) REFERENCES courseEditions(id) ON DELETE CASCADE,
  FOREIGN KEY (companyId) REFERENCES companies(id) ON DELETE SET NULL,
  UNIQUE(studentId, courseEditionId)
);
CREATE INDEX IF NOT EXISTS reg_clientId_idx ON registrations(clientId);

-- 9. Tabella Presenze (Pagina 8)
CREATE TABLE IF NOT EXISTS attendances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  registrationId INTEGER NOT NULL,
  attendanceDate TEXT NOT NULL,
  status TEXT DEFAULT 'present' NOT NULL,
  hoursAttended INTEGER NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (registrationId) REFERENCES registrations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS att_clientId_idx ON attendances(clientId);

-- 10. Impostazioni Email (Pagina 11)
CREATE TABLE IF NOT EXISTS emailSettings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  host TEXT,
  port INTEGER,
  username TEXT,
  password TEXT,
  fromEmail TEXT,
  fromName TEXT,
  useSsl INTEGER DEFAULT 1,
  resendApiKey TEXT,
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE
);

-- Popolamento Dati di Esempio (Mandatorio)
INSERT INTO clients (email, passwordHash, name, plan, subscriptionStatus) VALUES 
('admin@gestionalesicurezza.it', '$2a$10$r.7fX3n.yP7P.Y/f0mX8e.h9k9k9k9k9k9k9k9k9k9k9k9k9k9k', 'Amministrazione Centrale', 'enterprise', 'active');

INSERT INTO agents (clientId, name, email) VALUES 
(1, 'Marco Agenti', 'marco@agenti.it'),
(1, 'Studio Consulenza SRL', 'info@studioconsulenza.it');

INSERT INTO companies (clientId, name, vatNumber, city, agentId) VALUES 
(1, 'Azienda Meccanica Rossi', '12345678901', 'Milano', 1),
(1, 'Edilizia Bianchi SPA', '09876543210', 'Roma', 2),
(1, 'Logistica Verde SRL', '11223344556', 'Torino', 1),
(1, 'Ristorazione Oro', '66778899001', 'Napoli', 2),
(1, 'Servizi Pulizia H2O', '55443322110', 'Firenze', 1);

INSERT INTO courses (clientId, title, code, durationHours, defaultPrice, certificateValidityMonths) VALUES 
(1, 'Sicurezza Generale Art. 37', 'GEN-01', 4, 50, 60),
(1, 'RSPP Datore di Lavoro - Rischio Alto', 'RSPP-A', 48, 500, 60),
(1, 'Primo Soccorso - Aggiornamento', 'PS-AGG', 4, 80, 36),
(1, 'Antincendio Rischio Medio', 'ANT-M', 8, 120, 60),
(1, 'RLS - Formazione Base', 'RLS-B', 32, 350, 12);
