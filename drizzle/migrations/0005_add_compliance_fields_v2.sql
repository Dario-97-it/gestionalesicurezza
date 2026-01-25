-- Migrazione 0005: Aggiunta campi di compliance 81/08 (Mansione, Rischio Azienda) e data attestato

-- Tabella companies: Aggiunta categoria di rischio
ALTER TABLE companies ADD COLUMN riskCategory TEXT DEFAULT 'low' NOT NULL;

-- Tabella students: Aggiunta mansione
ALTER TABLE students ADD COLUMN jobRole TEXT DEFAULT 'altro';

-- Tabella registrations: Aggiunta data attestato
ALTER TABLE registrations ADD COLUMN certificateDate TEXT;
