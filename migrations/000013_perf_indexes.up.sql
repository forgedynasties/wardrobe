CREATE INDEX IF NOT EXISTS idx_outfit_items_outfit_id ON outfit_items (outfit_id);
CREATE INDEX IF NOT EXISTS idx_outfit_items_clothing_item_id ON outfit_items (clothing_item_id);
CREATE INDEX IF NOT EXISTS idx_outfit_logs_outfit_id_owner ON outfit_logs (outfit_id, owner);
CREATE INDEX IF NOT EXISTS idx_outfit_log_items_clothing_item_id ON outfit_log_items (clothing_item_id);
CREATE INDEX IF NOT EXISTS idx_clothing_items_owner_created_at ON clothing_items (owner, created_at DESC);
