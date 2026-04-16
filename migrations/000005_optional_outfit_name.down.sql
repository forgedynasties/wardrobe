UPDATE outfits SET name = 'Unnamed Outfit' WHERE name = '' OR name IS NULL;
ALTER TABLE outfits ALTER COLUMN name SET NOT NULL;
ALTER TABLE outfits ALTER COLUMN name DROP DEFAULT;
