ALTER TABLE wishlist_items
    DROP COLUMN IF EXISTS priority,
    DROP COLUMN IF EXISTS notes,
    DROP COLUMN IF EXISTS bought_at;

ALTER TABLE users
    DROP COLUMN IF EXISTS wishlist_share_token;
