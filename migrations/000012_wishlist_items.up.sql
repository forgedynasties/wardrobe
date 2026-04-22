CREATE TABLE wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    image_url TEXT,
    product_url TEXT NOT NULL,
    price_pkr BIGINT NOT NULL,
    owner VARCHAR(20) NOT NULL DEFAULT 'ali',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wishlist_items_owner ON wishlist_items(owner);
