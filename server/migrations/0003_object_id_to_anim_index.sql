-- Rename object_id to anim_index and convert values.
-- ACT1 animations: anim_index = object_id - 500 (world slot 0).
-- All existing records are ACT1, so the conversion is straightforward.
ALTER TABLE memory_completions RENAME COLUMN object_id TO anim_index;

UPDATE memory_completions SET anim_index = anim_index - 500;
