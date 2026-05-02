-- Denormalized latest-per-event view of memory_completions.
-- Powers /api/memories/latest, /api/memory/:eventId, /api/sitemap.
-- Update memory_events alongside any schema change to memory_completions.
CREATE TABLE IF NOT EXISTS memory_events (
    event_id     TEXT PRIMARY KEY,
    anim_index   INTEGER NOT NULL,
    completed_at INTEGER NOT NULL,
    participants TEXT NOT NULL,
    language     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_events_completed_at
    ON memory_events(completed_at DESC);

-- AFTER INSERT does not fire when INSERT OR IGNORE hits the UNIQUE conflict,
-- so duplicate completions correctly do not update memory_events.
CREATE TRIGGER IF NOT EXISTS memory_events_after_insert
AFTER INSERT ON memory_completions
BEGIN
    INSERT INTO memory_events (event_id, anim_index, completed_at, participants, language)
    VALUES (NEW.event_id, NEW.anim_index, NEW.completed_at, NEW.participants, NEW.language)
    ON CONFLICT(event_id) DO UPDATE SET
        anim_index   = excluded.anim_index,
        completed_at = excluded.completed_at,
        participants = excluded.participants,
        language     = excluded.language
    WHERE excluded.completed_at > memory_events.completed_at;
END;

-- Backfill: pick the latest row per event_id deterministically by (completed_at DESC, id DESC).
-- UPSERT semantics so writes captured by the trigger between CREATE TRIGGER and now are not clobbered.
INSERT INTO memory_events (event_id, anim_index, completed_at, participants, language)
SELECT event_id, anim_index, completed_at, participants, language
FROM memory_completions mc
WHERE id = (
    SELECT id FROM memory_completions mc2
    WHERE mc2.event_id = mc.event_id
    ORDER BY completed_at DESC, id DESC
    LIMIT 1
)
ON CONFLICT(event_id) DO UPDATE SET
    anim_index   = excluded.anim_index,
    completed_at = excluded.completed_at,
    participants = excluded.participants,
    language     = excluded.language
WHERE excluded.completed_at >= memory_events.completed_at;
