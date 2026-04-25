ALTER TABLE users
    ADD COLUMN IF NOT EXISTS profile_config JSONB NOT NULL DEFAULT
        '{"sections":{"snapshot":false,"outfits":false,"calendar":false,"signature":false}}';
