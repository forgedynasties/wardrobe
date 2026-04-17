ALTER TABLE clothing_items ADD COLUMN colors TEXT[] NOT NULL DEFAULT '{}';
UPDATE clothing_items SET colors = ARRAY[color_hex] WHERE color_hex IS NOT NULL AND color_hex != '';
ALTER TABLE clothing_items DROP COLUMN color_hex;
