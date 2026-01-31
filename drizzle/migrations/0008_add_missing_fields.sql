-- Aggiungere campi mancanti alle tabelle

-- 1. Aggiungere isActive a courseEditions
ALTER TABLE courseEditions ADD COLUMN isActive INTEGER DEFAULT 1 NOT NULL;

-- 2. Rendere location nullable in courseEditions
-- SQLite non supporta ALTER COLUMN, quindi usiamo una procedura di ricreazione
-- Questo verrà fatto manualmente tramite migration

-- 3. Aggiungere attendancePercent a registrations
ALTER TABLE registrations ADD COLUMN attendancePercent INTEGER;

-- 4. Aggiungere isActive a students
ALTER TABLE students ADD COLUMN isActive INTEGER DEFAULT 1 NOT NULL;
