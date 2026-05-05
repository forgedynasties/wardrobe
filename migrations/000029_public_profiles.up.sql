ALTER TABLE users
    ALTER COLUMN profile_config SET DEFAULT
        '{"sections":{"snapshot":true,"outfits":true,"calendar":true,"signature":true,"wishlist":true}}';
