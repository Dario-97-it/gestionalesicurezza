-- Migration SQL for D1 Database
-- Add digital signature fields to attendances table

ALTER TABLE attendances ADD COLUMN signInTime TEXT;
ALTER TABLE attendances ADD COLUMN signOutTime TEXT;
ALTER TABLE attendances ADD COLUMN signatureHash TEXT;
ALTER TABLE attendances ADD COLUMN signatureMethod TEXT DEFAULT 'manual';

-- Note: No need to update existing records as they will default to NULL/manual.
