package storage

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
	_ "github.com/lib/pq"

	"wardrobe/internal/domain"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

// Items

func (s *Store) ListItems() ([]domain.ClothingItem, error) {
	rows, err := s.db.Query(`
		SELECT id, category, sub_category, color_hex, material, image_url, raw_image_url, image_status, last_worn, created_at, updated_at
		FROM clothing_items ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.ClothingItem
	for rows.Next() {
		var item domain.ClothingItem
		err := rows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) GetItem(id uuid.UUID) (*domain.ClothingItem, error) {
	var item domain.ClothingItem
	err := s.db.QueryRow(`
		SELECT id, category, sub_category, color_hex, material, image_url, raw_image_url, image_status, last_worn, created_at, updated_at
		FROM clothing_items WHERE id = $1`, id).
		Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *Store) CreateItem(req domain.CreateItemRequest) (*domain.ClothingItem, error) {
	var item domain.ClothingItem
	err := s.db.QueryRow(`
		INSERT INTO clothing_items (category, sub_category, color_hex, material, image_url, raw_image_url)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, category, sub_category, color_hex, material, image_url, raw_image_url, image_status, last_worn, created_at, updated_at`,
		req.Category, req.SubCategory, req.ColorHex, req.Material, req.ImageURL, req.RawImageURL).
		Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *Store) UpdateItem(id uuid.UUID, req domain.UpdateItemRequest) (*domain.ClothingItem, error) {
	var item domain.ClothingItem
	err := s.db.QueryRow(`
		UPDATE clothing_items SET
			category = COALESCE($2, category),
			sub_category = COALESCE($3, sub_category),
			color_hex = COALESCE($4, color_hex),
			material = COALESCE($5, material),
			image_url = COALESCE($6, image_url),
			raw_image_url = COALESCE($7, raw_image_url),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, category, sub_category, color_hex, material, image_url, raw_image_url, image_status, last_worn, created_at, updated_at`,
		id, req.Category, req.SubCategory, req.ColorHex, req.Material, req.ImageURL, req.RawImageURL).
		Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (s *Store) DeleteItem(id uuid.UUID) error {
	result, err := s.db.Exec(`DELETE FROM clothing_items WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("item not found")
	}
	return nil
}

func (s *Store) WearItem(id uuid.UUID) error {
	_, err := s.db.Exec(`UPDATE clothing_items SET last_worn = $2, updated_at = NOW() WHERE id = $1`, id, time.Now())
	return err
}

// Image Status

func (s *Store) UpdateImageStatus(id uuid.UUID, status, imageURL, rawImageURL string) error {
	_, err := s.db.Exec(`
		UPDATE clothing_items SET image_status = $2, image_url = $3, raw_image_url = $4, updated_at = NOW()
		WHERE id = $1`, id, status, imageURL, rawImageURL)
	return err
}

func (s *Store) SetImageProcessing(id uuid.UUID, rawImageURL string) error {
	_, err := s.db.Exec(`
		UPDATE clothing_items SET image_status = 'processing', raw_image_url = $2, updated_at = NOW()
		WHERE id = $1`, id, rawImageURL)
	return err
}

// Outfits

func (s *Store) ListOutfits() ([]domain.Outfit, error) {
	rows, err := s.db.Query(`
		SELECT id, name, season, vibe, usage_count, last_worn, created_at, updated_at
		FROM outfits ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outfits []domain.Outfit
	for rows.Next() {
		var o domain.Outfit
		err := rows.Scan(&o.ID, &o.Name, &o.Season, pq.Array(&o.Vibe), &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
		if err != nil {
			return nil, err
		}

		// Load items for this outfit
		itemRows, err := s.db.Query(`
			SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
			FROM clothing_items ci
			JOIN outfit_items oi ON oi.clothing_item_id = ci.id
			WHERE oi.outfit_id = $1`, o.ID)
		if err != nil {
			return nil, err
		}

		for itemRows.Next() {
			var item domain.ClothingItem
			err := itemRows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
				&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
			if err != nil {
				itemRows.Close()
				return nil, err
			}
			o.Items = append(o.Items, item)
		}
		itemRows.Close()

		outfits = append(outfits, o)
	}
	return outfits, rows.Err()
}

func (s *Store) GetOutfit(id uuid.UUID) (*domain.Outfit, error) {
	var o domain.Outfit
	err := s.db.QueryRow(`
		SELECT id, name, season, vibe, usage_count, last_worn, created_at, updated_at
		FROM outfits WHERE id = $1`, id).
		Scan(&o.ID, &o.Name, &o.Season, pq.Array(&o.Vibe), &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.Query(`
		SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
		FROM clothing_items ci
		JOIN outfit_items oi ON oi.clothing_item_id = ci.id
		WHERE oi.outfit_id = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item domain.ClothingItem
		err := rows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		o.Items = append(o.Items, item)
	}
	return &o, rows.Err()
}

func (s *Store) CreateOutfit(req domain.CreateOutfitRequest) (*domain.Outfit, error) {
	var o domain.Outfit
	err := s.db.QueryRow(`
		INSERT INTO outfits (name, season, vibe)
		VALUES ($1, $2, $3)
		RETURNING id, name, season, vibe, usage_count, last_worn, created_at, updated_at`,
		req.Name, req.Season, pq.Array(req.Vibe)).
		Scan(&o.ID, &o.Name, &o.Season, pq.Array(&o.Vibe), &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *Store) UpdateOutfit(id uuid.UUID, req domain.UpdateOutfitRequest) (*domain.Outfit, error) {
	var o domain.Outfit
	err := s.db.QueryRow(`
		UPDATE outfits SET
			name = COALESCE($2, name),
			season = COALESCE($3, season),
			vibe = COALESCE($4, vibe),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, season, vibe, usage_count, last_worn, created_at, updated_at`,
		id, req.Name, req.Season, pq.Array(req.Vibe)).
		Scan(&o.ID, &o.Name, &o.Season, pq.Array(&o.Vibe), &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return &o, nil
}

func (s *Store) DeleteOutfit(id uuid.UUID) error {
	result, err := s.db.Exec(`DELETE FROM outfits WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("outfit not found")
	}
	return nil
}

func (s *Store) AddOutfitItem(outfitID, itemID uuid.UUID) error {
	_, err := s.db.Exec(`INSERT INTO outfit_items (outfit_id, clothing_item_id) VALUES ($1, $2)`, outfitID, itemID)
	return err
}

func (s *Store) RemoveOutfitItem(outfitID, itemID uuid.UUID) error {
	result, err := s.db.Exec(`DELETE FROM outfit_items WHERE outfit_id = $1 AND clothing_item_id = $2`, outfitID, itemID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("item not in outfit")
	}
	return nil
}

func (s *Store) WearOutfit(id uuid.UUID) (*domain.Outfit, error) {
	var o domain.Outfit
	err := s.db.QueryRow(`
		UPDATE outfits SET
			usage_count = usage_count + 1,
			last_worn = NOW(),
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, season, vibe, usage_count, last_worn, created_at, updated_at`,
		id).
		Scan(&o.ID, &o.Name, &o.Season, pq.Array(&o.Vibe), &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}

	rows, err := s.db.Query(`
		SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
		FROM clothing_items ci
		JOIN outfit_items oi ON oi.clothing_item_id = ci.id
		WHERE oi.outfit_id = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var item domain.ClothingItem
		err := rows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		o.Items = append(o.Items, item)
	}

	return &o, rows.Err()
}

// Outfit Logs

func (s *Store) LogOutfitWear(req domain.LogOutfitWearRequest) (*domain.OutfitLog, error) {
	var log domain.OutfitLog
	err := s.db.QueryRow(`
		INSERT INTO outfit_logs (outfit_id, wear_date, notes)
		VALUES ($1, $2, $3)
		RETURNING id, outfit_id, wear_date, notes, created_at, updated_at`,
		req.OutfitID, req.WearDate, req.Notes).
		Scan(&log.ID, &log.OutfitID, &log.WearDate, &log.Notes, &log.CreatedAt, &log.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Add items if provided (for manual logs)
	for _, itemID := range req.ItemIDs {
		_, err := s.db.Exec(`
			INSERT INTO outfit_log_items (outfit_log_id, clothing_item_id)
			VALUES ($1, $2)`,
			log.ID, itemID)
		if err != nil {
			return nil, err
		}
	}

	// Load items
	if len(req.ItemIDs) > 0 {
		itemRows, err := s.db.Query(`
			SELECT id, category, sub_category, color_hex, material, image_url, raw_image_url, image_status, last_worn, created_at, updated_at
			FROM clothing_items WHERE id = ANY($1)`,
			pq.Array(req.ItemIDs))
		if err != nil {
			return nil, err
		}
		defer itemRows.Close()

		for itemRows.Next() {
			var item domain.ClothingItem
			err := itemRows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
				&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
			if err != nil {
				return nil, err
			}
			log.Items = append(log.Items, item)
		}
	}

	return &log, nil
}

func (s *Store) GetOutfitLogs(startDate, endDate time.Time) ([]domain.OutfitLog, error) {
	rows, err := s.db.Query(`
		SELECT id, outfit_id, wear_date, notes, created_at, updated_at
		FROM outfit_logs
		WHERE wear_date >= $1 AND wear_date <= $2
		ORDER BY wear_date DESC`,
		startDate, endDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []domain.OutfitLog
	for rows.Next() {
		var log domain.OutfitLog
		err := rows.Scan(&log.ID, &log.OutfitID, &log.WearDate, &log.Notes, &log.CreatedAt, &log.UpdatedAt)
		if err != nil {
			return nil, err
		}

		// Load items based on whether it's an outfit log or manual items log
		if log.OutfitID != nil {
			// Load items from the outfit
			itemRows, err := s.db.Query(`
				SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
				FROM clothing_items ci
				JOIN outfit_items oi ON oi.clothing_item_id = ci.id
				WHERE oi.outfit_id = $1`, log.OutfitID)
			if err != nil {
				return nil, err
			}

			for itemRows.Next() {
				var item domain.ClothingItem
				err := itemRows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
					&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
				if err != nil {
					itemRows.Close()
					return nil, err
				}
				log.Items = append(log.Items, item)
			}
			itemRows.Close()
		} else {
			// Load items from manual log
			itemRows, err := s.db.Query(`
				SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
				FROM clothing_items ci
				JOIN outfit_log_items oli ON oli.clothing_item_id = ci.id
				WHERE oli.outfit_log_id = $1`, log.ID)
			if err != nil {
				return nil, err
			}

			for itemRows.Next() {
				var item domain.ClothingItem
				err := itemRows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
					&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
				if err != nil {
					itemRows.Close()
					return nil, err
				}
				log.Items = append(log.Items, item)
			}
			itemRows.Close()
		}

		logs = append(logs, log)
	}
	return logs, rows.Err()
}

func (s *Store) GetOutfitLogByDate(wearDate time.Time) (*domain.OutfitLog, error) {
	var log domain.OutfitLog
	err := s.db.QueryRow(`
		SELECT id, outfit_id, wear_date, notes, created_at, updated_at
		FROM outfit_logs
		WHERE wear_date = $1
		LIMIT 1`,
		wearDate).
		Scan(&log.ID, &log.OutfitID, &log.WearDate, &log.Notes, &log.CreatedAt, &log.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Load items
	itemRows, err := s.db.Query(`
		SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
		FROM clothing_items ci
		JOIN outfit_log_items oli ON oli.clothing_item_id = ci.id
		WHERE oli.outfit_log_id = $1`, log.ID)
	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var item domain.ClothingItem
		err := itemRows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt)
		if err != nil {
			return nil, err
		}
		log.Items = append(log.Items, item)
	}

	return &log, itemRows.Err()
}

func (s *Store) DeleteOutfitLog(logID uuid.UUID) error {
	result, err := s.db.Exec(`DELETE FROM outfit_logs WHERE id = $1`, logID)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("outfit log not found")
	}
	return nil
}
