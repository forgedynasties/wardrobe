-- Two-user scope: Ali (existing data) and Alishba (new).
ALTER TABLE clothing_items ADD COLUMN owner VARCHAR(20) NOT NULL DEFAULT 'ali';
ALTER TABLE outfits        ADD COLUMN owner VARCHAR(20) NOT NULL DEFAULT 'ali';
ALTER TABLE outfit_logs    ADD COLUMN owner VARCHAR(20) NOT NULL DEFAULT 'ali';

-- Replace single-column date index with composite (owner, wear_date).
DROP INDEX IF EXISTS idx_outfit_logs_date;
CREATE INDEX idx_outfit_logs_owner_date ON outfit_logs(owner, wear_date);

-- Allow both users to log the same date: unique constraint must include owner.
ALTER TABLE outfit_logs DROP CONSTRAINT IF EXISTS unique_outfit_logs_date;
ALTER TABLE outfit_logs ADD CONSTRAINT unique_outfit_logs_owner_date UNIQUE (owner, wear_date);

CREATE INDEX idx_clothing_items_owner ON clothing_items(owner);
CREATE INDEX idx_outfits_owner        ON outfits(owner);
