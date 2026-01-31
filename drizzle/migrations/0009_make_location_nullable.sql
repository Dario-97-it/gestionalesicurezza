-- Rendere location nullable in courseEditions
-- SQLite non supporta ALTER COLUMN, quindi ricrei la tabella

PRAGMA foreign_keys=OFF;

-- Rinominare la tabella vecchia
ALTER TABLE courseEditions RENAME TO courseEditions_old;

-- Creare la nuova tabella con location nullable
CREATE TABLE courseEditions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  courseId INTEGER NOT NULL,
  startDate TEXT NOT NULL,
  endDate TEXT NOT NULL,
  location TEXT,
  instructorId INTEGER,
  instructor TEXT,
  maxParticipants INTEGER NOT NULL,
  minParticipants INTEGER DEFAULT 1,
  price INTEGER NOT NULL,
  customPrice INTEGER,
  status TEXT DEFAULT 'scheduled' NOT NULL,
  isDedicated INTEGER DEFAULT 0,
  dedicatedCompanyId INTEGER,
  isActive INTEGER DEFAULT 1 NOT NULL,
  notes TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (instructorId) REFERENCES instructors(id) ON DELETE SET NULL,
  FOREIGN KEY (dedicatedCompanyId) REFERENCES companies(id) ON DELETE SET NULL
);

-- Copiare i dati dalla vecchia tabella
INSERT INTO courseEditions SELECT * FROM courseEditions_old;

-- Eliminare la vecchia tabella
DROP TABLE courseEditions_old;

-- Ricreare gli indici
CREATE INDEX IF NOT EXISTS edition_clientId_idx ON courseEditions(clientId);

PRAGMA foreign_keys=ON;
