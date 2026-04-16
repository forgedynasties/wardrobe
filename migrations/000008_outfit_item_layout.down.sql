ALTER TABLE outfit_items
    DROP COLUMN IF EXISTS position_x,
    DROP COLUMN IF EXISTS position_y,
    DROP COLUMN IF EXISTS scale,
    DROP COLUMN IF EXISTS z_index;
