-- Migration: Add D.Lgs. 81/08 Compliance Fields
-- Date: 2026-01-25
-- Description: Add mandatory fields for workplace safety compliance

-- Add fields to students table
ALTER TABLE students ADD COLUMN jobRole TEXT;
ALTER TABLE students ADD COLUMN riskLevel TEXT CHECK(riskLevel IN ('low', 'medium', 'high'));

-- Add fields to courses table for prerequisites and risk level validation
ALTER TABLE courses ADD COLUMN minRiskLevel TEXT CHECK(minRiskLevel IN ('low', 'medium', 'high'));
ALTER TABLE courses ADD COLUMN hasPrerequisite INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN prerequisiteCourseId INTEGER REFERENCES courses(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_student_riskLevel ON students(clientId, riskLevel);
CREATE INDEX idx_course_minRiskLevel ON courses(clientId, minRiskLevel);
CREATE INDEX idx_course_prerequisite ON courses(prerequisiteCourseId);

-- Add comments/documentation (SQLite doesn't support comments directly, but we document here)
-- jobRole: Mansione dell'operatore (es. "Operaio", "Impiegato", "Dirigente", "Preposto")
-- riskLevel: Livello di rischio dell'operatore (Basso, Medio, Alto) per 81/08
-- minRiskLevel: Livello di rischio minimo richiesto per seguire il corso
-- hasPrerequisite: Se il corso richiede un prerequisito (es. Aggiornamento richiede Base)
-- prerequisiteCourseId: ID del corso prerequisito
