ALTER TABLE courseEditions ADD COLUMN editionType TEXT DEFAULT 'private' CHECK(editionType IN ('private', 'multi'));

CREATE INDEX IF NOT EXISTS idx_courseEditions_editionType ON courseEditions(editionType);
