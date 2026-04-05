-- Drop redundant char_index/display_name columns (always equal to participants[0])
-- and enforce non-empty participants via CHECK constraint.
CREATE TABLE IF NOT EXISTS memory_completions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    object_id INTEGER NOT NULL,
    event_id TEXT NOT NULL,
    completed_at INTEGER NOT NULL,
    participants TEXT NOT NULL CHECK(json_array_length(participants) > 0),
    UNIQUE(user_id, event_id)
);

INSERT OR IGNORE INTO memory_completions_new (id, user_id, object_id, event_id, completed_at, participants)
    SELECT id, user_id, object_id, event_id, completed_at, participants
    FROM memory_completions
    WHERE json_array_length(participants) > 0;

DROP TABLE IF EXISTS memory_completions;

ALTER TABLE memory_completions_new RENAME TO memory_completions;
