-- SecurityTools Database Schema Update
-- Versione: 1.1.0
-- Data: Gennaio 2026
-- Nuove funzionalità: Prezzo differenziato per azienda, Soglia minima partecipanti, Riproposta assenti

-- Aggiunge colonne mancanti a courseEditions se non esistono
-- editionType: public (aperta a tutti), private (una azienda), multi (più aziende selezionate)
-- minParticipants: soglia minima per attivare l'edizione
ALTER TABLE courseEditions ADD COLUMN editionType TEXT DEFAULT 'public' CHECK (editionType IN ('public', 'private', 'multi'));
ALTER TABLE courseEditions ADD COLUMN minParticipants INTEGER DEFAULT 1;
ALTER TABLE courseEditions ADD COLUMN notes TEXT;
ALTER TABLE courseEditions ADD COLUMN calendarInviteSent INTEGER DEFAULT 0;

-- Aggiunge isActive a instructors se non esiste
ALTER TABLE instructors ADD COLUMN isActive INTEGER DEFAULT 1;

-- Aggiunge minAttendancePercent a courses se non esiste
ALTER TABLE courses ADD COLUMN minAttendancePercent INTEGER DEFAULT 90;

-- Aggiunge campi tracking frequenza a registrations
ALTER TABLE registrations ADD COLUMN totalHoursAttended INTEGER DEFAULT 0;
ALTER TABLE registrations ADD COLUMN attendancePercent INTEGER DEFAULT 0;
ALTER TABLE registrations ADD COLUMN certificateIssued INTEGER DEFAULT 0;
ALTER TABLE registrations ADD COLUMN certificateIssuedAt TEXT;

-- Aggiunge hoursAttended a attendances
ALTER TABLE attendances ADD COLUMN hoursAttended INTEGER DEFAULT 0;

-- Edition Allowed Companies - Aziende autorizzate per edizioni "multi"
CREATE TABLE IF NOT EXISTS editionAllowedCompanies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  editionId INTEGER NOT NULL REFERENCES courseEditions(id) ON DELETE CASCADE,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(editionId, companyId)
);
CREATE INDEX IF NOT EXISTS eac_editionId_idx ON editionAllowedCompanies(editionId);
CREATE INDEX IF NOT EXISTS eac_companyId_idx ON editionAllowedCompanies(companyId);

-- Edition Company Prices - Prezzi personalizzati per azienda nell'edizione
-- Permette di impostare un prezzo diverso per ogni azienda partecipante
CREATE TABLE IF NOT EXISTS editionCompanyPrices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  editionId INTEGER NOT NULL REFERENCES courseEditions(id) ON DELETE CASCADE,
  companyId INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  customPrice INTEGER NOT NULL, -- Prezzo in centesimi
  notes TEXT, -- Note sul prezzo (es. "Sconto 10% accordo quadro")
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(editionId, companyId)
);
CREATE INDEX IF NOT EXISTS ecp_clientId_idx ON editionCompanyPrices(clientId);
CREATE INDEX IF NOT EXISTS ecp_editionId_idx ON editionCompanyPrices(editionId);
CREATE INDEX IF NOT EXISTS ecp_companyId_idx ON editionCompanyPrices(companyId);

-- Edition Sessions table - Sessioni/giornate di un'edizione corso
CREATE TABLE IF NOT EXISTS editionSessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  editionId INTEGER NOT NULL REFERENCES courseEditions(id) ON DELETE CASCADE,
  sessionDate TEXT NOT NULL,
  startTime TEXT NOT NULL,
  endTime TEXT NOT NULL,
  hours INTEGER NOT NULL,
  location TEXT,
  notes TEXT,
  calendarEventId TEXT,
  calendarInviteSentAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS session_clientId_idx ON editionSessions(clientId);
CREATE INDEX IF NOT EXISTS session_editionId_idx ON editionSessions(editionId);
CREATE INDEX IF NOT EXISTS session_sessionDate_idx ON editionSessions(sessionDate);

-- Session Attendances table - Presenze per singola sessione
CREATE TABLE IF NOT EXISTS sessionAttendances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  registrationId INTEGER NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  sessionId INTEGER NOT NULL REFERENCES editionSessions(id) ON DELETE CASCADE,
  hoursAttended INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'absent' NOT NULL CHECK (status IN ('present', 'absent', 'partial')),
  notes TEXT,
  recordedBy INTEGER REFERENCES users(id) ON DELETE SET NULL,
  recordedAt TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(registrationId, sessionId)
);
CREATE INDEX IF NOT EXISTS satt_clientId_idx ON sessionAttendances(clientId);
CREATE INDEX IF NOT EXISTS satt_registrationId_idx ON sessionAttendances(registrationId);
CREATE INDEX IF NOT EXISTS satt_sessionId_idx ON sessionAttendances(sessionId);

-- Calendar Invites Log - Log degli inviti calendario inviati
CREATE TABLE IF NOT EXISTS calendarInvites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sessionId INTEGER NOT NULL REFERENCES editionSessions(id) ON DELETE CASCADE,
  instructorId INTEGER NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  instructorEmail TEXT NOT NULL,
  inviteType TEXT NOT NULL CHECK (inviteType IN ('create', 'update', 'cancel')),
  eventUid TEXT NOT NULL,
  sentAt TEXT NOT NULL DEFAULT (datetime('now')),
  deliveryStatus TEXT DEFAULT 'sent' CHECK (deliveryStatus IN ('sent', 'delivered', 'failed')),
  errorMessage TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ci_clientId_idx ON calendarInvites(clientId);
CREATE INDEX IF NOT EXISTS ci_sessionId_idx ON calendarInvites(sessionId);
CREATE INDEX IF NOT EXISTS ci_instructorId_idx ON calendarInvites(instructorId);

-- Email Settings table - Credenziali Gmail per invio inviti calendario
CREATE TABLE IF NOT EXISTS emailSettings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  twoFactorCode TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(clientId)
);
CREATE INDEX IF NOT EXISTS emailSettings_clientId_idx ON emailSettings(clientId);

-- Indice per editionType
CREATE INDEX IF NOT EXISTS edition_editionType_idx ON courseEditions(editionType);
