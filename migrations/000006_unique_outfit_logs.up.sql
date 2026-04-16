-- Add unique constraint on wear_date to prevent duplicate logs per day
ALTER TABLE outfit_logs ADD CONSTRAINT unique_outfit_logs_date UNIQUE (wear_date);
