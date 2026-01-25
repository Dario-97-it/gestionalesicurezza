-- Migration SQL for D1 Database
-- Add 'certificateValidityMonths' to courses table
ALTER TABLE courses ADD COLUMN certificateValidityMonths INTEGER;

-- Add 'status' and 'recommendedNextEditionId' to registrations table
-- Note: D1/SQLite does not support ALTER TABLE ADD COLUMN with foreign key constraint directly.
-- We add the column and rely on Drizzle/Application logic for the foreign key constraint.
ALTER TABLE registrations ADD COLUMN status TEXT DEFAULT 'pending' NOT NULL;
ALTER TABLE registrations ADD COLUMN recommendedNextEditionId INTEGER;

-- Update existing registrations to 'confirmed' status (assuming they were all confirmed before this migration)
UPDATE registrations SET status = 'confirmed' WHERE status = 'pending';

-- Re-create the unique index to include the new status enum values
-- (This step is often managed by Drizzle's migration tool, but for manual D1, it's good practice to consider)
-- Since we are only adding columns, the existing unique index on (studentId, courseEditionId) is still valid.
