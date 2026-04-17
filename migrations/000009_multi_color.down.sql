ALTER TABLE clothing_items ADD COLUMN color_hex VARCHAR(7);
UPDATE clothing_items SET color_hex = colors[1] WHERE array_length(colors, 1) > 0;
ALTER TABLE clothing_items DROP COLUMN colors;
