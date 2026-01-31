-- Correggere il campo certificateValidityMonths per renderlo nullable
ALTER TABLE courses RENAME TO courses_old;

CREATE TABLE courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT,
  durationHours INTEGER NOT NULL,
  defaultPrice INTEGER NOT NULL,
  certificateValidityMonths INTEGER,
  minRiskLevel TEXT,
  hasPrerequisite INTEGER DEFAULT 0,
  prerequisiteCourseId INTEGER,
  description TEXT,
  isActive INTEGER DEFAULT 1 NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisiteCourseId) REFERENCES courses(id) ON DELETE SET NULL
);

INSERT INTO courses SELECT * FROM courses_old;
DROP TABLE courses_old;
CREATE INDEX IF NOT EXISTS course_clientId_idx ON courses(clientId);
