-- Index on (event_id, completed_at DESC) for memory_completions.
-- Speeds up the per-event "latest row" lookup used by the account-deletion
-- reconcile in account.ts (the correlated subquery in
-- INSERT INTO memory_events ... SELECT ... WHERE id = (SELECT id FROM mc2 ...)).
-- Without this index that subquery is O(rows^2); with it, O(rows * log rows).
CREATE INDEX IF NOT EXISTS idx_memory_completions_event_completed
    ON memory_completions(event_id, completed_at DESC);
