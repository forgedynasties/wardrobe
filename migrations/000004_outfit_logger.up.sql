CREATE TABLE outfit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    outfit_id UUID REFERENCES outfits(id) ON DELETE SET NULL,
    wear_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outfit_logs_date ON outfit_logs(wear_date);
CREATE INDEX idx_outfit_logs_outfit ON outfit_logs(outfit_id);

-- For manually logged wears (log items without outfit)
CREATE TABLE outfit_log_items (
    outfit_log_id UUID NOT NULL REFERENCES outfit_logs(id) ON DELETE CASCADE,
    clothing_item_id UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
    PRIMARY KEY (outfit_log_id, clothing_item_id)
);
