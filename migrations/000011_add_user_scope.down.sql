DROP INDEX IF EXISTS idx_outfits_owner;
DROP INDEX IF EXISTS idx_clothing_items_owner;

ALTER TABLE outfit_logs DROP CONSTRAINT IF EXISTS unique_outfit_logs_owner_date;
ALTER TABLE outfit_logs ADD CONSTRAINT unique_outfit_logs_date UNIQUE (wear_date);

DROP INDEX IF EXISTS idx_outfit_logs_owner_date;
CREATE INDEX idx_outfit_logs_date ON outfit_logs(wear_date);

ALTER TABLE outfit_logs    DROP COLUMN IF EXISTS owner;
ALTER TABLE outfits        DROP COLUMN IF EXISTS owner;
ALTER TABLE clothing_items DROP COLUMN IF EXISTS owner;
