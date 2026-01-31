-- Add minRiskLevel column to courses table
ALTER TABLE courses ADD COLUMN minRiskLevel TEXT DEFAULT 'low';
