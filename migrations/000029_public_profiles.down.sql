ALTER TABLE users
    ALTER COLUMN profile_config SET DEFAULT
        '{"sections":{"snapshot":false,"outfits":false,"calendar":false,"signature":false,"wishlist":false}}';
