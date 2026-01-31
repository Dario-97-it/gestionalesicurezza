-- Remove minRiskLevel column from courses table
-- Note: SQLite doesn't support DROP COLUMN in older versions, so we'll create a new table without this column
-- and copy the data over

-- Create new courses table without minRiskLevel
CREATE TABLE courses_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  clientId INTEGER NOT NULL,
  title TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT,
  durationHours INTEGER NOT NULL,
  defaultPrice INTEGER NOT NULL,
  certificateValidityMonths INTEGER,
  hasPrerequisite INTEGER DEFAULT 0,
  prerequisiteCourseId INTEGER,
  description TEXT,
  isActive INTEGER DEFAULT 1 NOT NULL,
  createdAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updatedAt TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (prerequisiteCourseId) REFERENCES courses(id) ON DELETE SET NULL
);

-- Copy data from old table
INSERT INTO courses_new (id, clientId, title, code, type, durationHours, defaultPrice, certificateValidityMonths, hasPrerequisite, prerequisiteCourseId, description, isActive, createdAt, updatedAt)
SELECT id, clientId, title, code, type, durationHours, defaultPrice, certificateValidityMonths, hasPrerequisite, prerequisiteCourseId, description, isActive, createdAt, updatedAt
FROM courses;

-- Drop old table
DROP TABLE courses;

-- Rename new table
ALTER TABLE courses_new RENAME TO courses;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS course_clientId_idx ON courses(clientId);
