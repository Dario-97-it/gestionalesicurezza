CREATE TABLE IF NOT EXISTS edition_agent_prices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_edition_id INTEGER NOT NULL REFERENCES course_editions(id) ON DELETE CASCADE,
  agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  price INTEGER NOT NULL DEFAULT 0,
  client_id INTEGER NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_edition_agent_prices_edition ON edition_agent_prices(course_edition_id);
