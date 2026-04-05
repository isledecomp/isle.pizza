-- Cloud save files (BLOBs)
CREATE TABLE IF NOT EXISTS user_saves (
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    data BLOB NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, filename)
);

-- Cloud config (isle.ini text)
CREATE TABLE IF NOT EXISTS user_config (
    user_id TEXT PRIMARY KEY,
    ini_text TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
