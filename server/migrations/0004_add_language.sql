-- Add language column to track which language version was used when the memory was recorded.
ALTER TABLE memory_completions ADD COLUMN language TEXT NOT NULL DEFAULT 'en';
