package storage

import (
	"database/sql"
	"fmt"
	"math/rand"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
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
		SELECT id, name, usage_count, last_worn, created_at, updated_at
		FROM outfits ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var outfits []domain.Outfit
	for rows.Next() {
		var o domain.Outfit
		err := rows.Scan(&o.ID, &o.Name, &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
		if err != nil {
			return nil, err
		}

		items, err := s.loadOutfitItems(o.ID)
		if err != nil {
			return nil, err
		}
		o.Items = items

		outfits = append(outfits, o)
	}
	return outfits, rows.Err()
}

func (s *Store) loadOutfitItems(outfitID uuid.UUID) ([]domain.OutfitItem, error) {
	rows, err := s.db.Query(`
		SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at,
			oi.position_x, oi.position_y, oi.scale, oi.z_index
		FROM clothing_items ci
		JOIN outfit_items oi ON oi.clothing_item_id = ci.id
		WHERE oi.outfit_id = $1
		ORDER BY oi.z_index ASC, ci.category ASC`, outfitID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.OutfitItem
	for rows.Next() {
		var item domain.OutfitItem
		if err := rows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt,
			&item.PositionX, &item.PositionY, &item.Scale, &item.ZIndex); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Store) GetOutfit(id uuid.UUID) (*domain.Outfit, error) {
	var o domain.Outfit
	err := s.db.QueryRow(`
		SELECT id, name, usage_count, last_worn, created_at, updated_at
		FROM outfits WHERE id = $1`, id).
		Scan(&o.ID, &o.Name, &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}

	items, err := s.loadOutfitItems(id)
	if err != nil {
		return nil, err
	}
	o.Items = items
	return &o, nil
}

func (s *Store) CreateOutfit(req domain.CreateOutfitRequest) (*domain.Outfit, error) {
	var o domain.Outfit
	err := s.db.QueryRow(`
		INSERT INTO outfits (name)
		VALUES ($1)
		RETURNING id, name, usage_count, last_worn, created_at, updated_at`,
		req.Name).
		Scan(&o.ID, &o.Name, &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
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
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, usage_count, last_worn, created_at, updated_at`,
		id, req.Name).
		Scan(&o.ID, &o.Name, &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
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
		RETURNING id, name, usage_count, last_worn, created_at, updated_at`,
		id).
		Scan(&o.ID, &o.Name, &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt)
	if err != nil {
		return nil, err
	}

	items, err := s.loadOutfitItems(id)
	if err != nil {
		return nil, err
	}
	o.Items = items

	return &o, nil
}

func (s *Store) UpdateOutfitLayout(outfitID uuid.UUID, layouts []domain.OutfitItemLayout) (*domain.Outfit, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	for _, l := range layouts {
		res, err := tx.Exec(`
			UPDATE outfit_items
			SET position_x = $3, position_y = $4, scale = $5, z_index = $6
			WHERE outfit_id = $1 AND clothing_item_id = $2`,
			outfitID, l.ClothingItemID, l.PositionX, l.PositionY, l.Scale, l.ZIndex)
		if err != nil {
			return nil, err
		}
		n, err := res.RowsAffected()
		if err != nil {
			return nil, err
		}
		if n == 0 {
			return nil, fmt.Errorf("item %s not in outfit", l.ClothingItemID)
		}
	}
	if _, err := tx.Exec(`UPDATE outfits SET updated_at = NOW() WHERE id = $1`, outfitID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.GetOutfit(outfitID)
}

// Helper function to find or create an outfit by items
func (s *Store) FindOrCreateOutfitByItems(itemIDs []uuid.UUID) (*domain.Outfit, error) {
	if len(itemIDs) == 0 {
		return nil, fmt.Errorf("cannot create outfit without items")
	}

	// Query for outfits with the exact item set
	// First get all outfits with same number of items
	rows, err := s.db.Query(`
		SELECT o.id, o.name, o.usage_count, o.last_worn, o.created_at, o.updated_at,
			COUNT(oi.clothing_item_id) as item_count
		FROM outfits o
		LEFT JOIN outfit_items oi ON oi.outfit_id = o.id
		GROUP BY o.id
		HAVING COUNT(oi.clothing_item_id) = $1`, len(itemIDs))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var o domain.Outfit
		var itemCount int
		err := rows.Scan(&o.ID, &o.Name, &o.UsageCount, &o.LastWorn, &o.CreatedAt, &o.UpdatedAt, &itemCount)
		if err != nil {
			continue
		}

		// Check if this outfit has exactly the items we're looking for
		itemRows, err := s.db.Query(`
			SELECT clothing_item_id FROM outfit_items WHERE outfit_id = $1 ORDER BY clothing_item_id
		`, o.ID)
		if err != nil {
			continue
		}

		match := true
		idx := 0
		for itemRows.Next() {
			var itemID uuid.UUID
			if err := itemRows.Scan(&itemID); err != nil {
				match = false
				break
			}
			// Check if item is in our list
			found := false
			for _, searchID := range itemIDs {
				if itemID == searchID {
					found = true
					break
				}
			}
			if !found {
				match = false
				break
			}
			idx++
		}
		itemRows.Close()

		if match && idx == len(itemIDs) {
			if o.Name == "" || o.Name == "Outfit" {
				newName := domain.RandomOutfitName()
				if _, err := s.db.Exec(`UPDATE outfits SET name = $1 WHERE id = $2`, newName, o.ID); err == nil {
					o.Name = newName
				}
			}
			return &o, nil
		}
	}

	// No matching outfit found, create new one
	o := domain.CreateOutfitRequest{Name: domain.RandomOutfitName()}
	outfit, err := s.CreateOutfit(o)
	if err != nil {
		return nil, err
	}

	// Add items to outfit
	for _, itemID := range itemIDs {
		if err := s.AddOutfitItem(outfit.ID, itemID); err != nil {
			return nil, err
		}
	}

	return outfit, nil
}

// Recommendations

func (s *Store) RecommendOutfits(limit int) ([]domain.OutfitRecommendation, error) {
	rows, err := s.db.Query(`
		WITH outfit_metrics AS (
			SELECT
				o.id, o.name, o.usage_count, o.last_worn, o.created_at, o.updated_at,
				COALESCE(EXTRACT(EPOCH FROM (NOW() - o.last_worn)) / 86400.0, 365.0) AS days_since_worn,
				EXTRACT(EPOCH FROM (NOW() - o.created_at)) / 86400.0 AS days_since_created,
				COALESCE((
					SELECT AVG(COALESCE(EXTRACT(EPOCH FROM (NOW() - ci.last_worn)) / 86400.0, 365.0))
					FROM outfit_items oi
					JOIN clothing_items ci ON ci.id = oi.clothing_item_id
					WHERE oi.outfit_id = o.id
				), 365.0) AS avg_item_days,
				(SELECT COUNT(*) FROM outfit_items oi WHERE oi.outfit_id = o.id) AS item_count
			FROM outfits o
		)
		SELECT id, name, usage_count, last_worn, created_at, updated_at,
			days_since_worn, days_since_created, avg_item_days,
			(
				0.4 * (1.0 - EXP(-days_since_worn / 14.0)) +
				0.2 * (1.0 / (1 + usage_count)) +
				0.3 * LEAST(avg_item_days / 14.0, 1.0) +
				0.1 * EXP(-days_since_created / 30.0)
			) AS score
		FROM outfit_metrics
		WHERE item_count >= 2
		ORDER BY score DESC
		LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var recs []domain.OutfitRecommendation
	for rows.Next() {
		var r domain.OutfitRecommendation
		var daysSinceWorn, daysSinceCreated, avgItemDays float64
		if err := rows.Scan(&r.ID, &r.Name, &r.UsageCount, &r.LastWorn, &r.CreatedAt, &r.UpdatedAt,
			&daysSinceWorn, &daysSinceCreated, &avgItemDays, &r.Score); err != nil {
			return nil, err
		}
		r.Reason = recommendationReason(r.LastWorn == nil, daysSinceWorn, r.UsageCount, daysSinceCreated)
		recs = append(recs, r)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for i := range recs {
		items, err := s.loadOutfitItems(recs[i].ID)
		if err != nil {
			return nil, err
		}
		recs[i].Items = items
	}

	return recs, nil
}

func recommendationReason(neverWorn bool, daysSinceWorn float64, usageCount int, daysSinceCreated float64) string {
	if neverWorn {
		return "Never worn"
	}
	days := int(daysSinceWorn)
	if days >= 21 {
		return fmt.Sprintf("Not worn in %d days", days)
	}
	if usageCount <= 1 {
		return "Rarely worn"
	}
	if daysSinceCreated < 7 {
		return "Recently created"
	}
	if days >= 7 {
		return fmt.Sprintf("Last worn %d days ago", days)
	}
	return "Worth revisiting"
}

// Suggestions: synthesize new outfit combos from stale items

func (s *Store) SuggestOutfits(count int) ([]domain.OutfitSuggestion, error) {
	pools, err := s.loadStaleItemPools()
	if err != nil {
		return nil, err
	}
	if len(pools["Top"]) == 0 || len(pools["Bottom"]) == 0 || len(pools["Shoes"]) == 0 {
		return []domain.OutfitSuggestion{}, nil
	}

	existing, err := s.loadOutfitSignatures()
	if err != nil {
		return nil, err
	}

	suggestions := []domain.OutfitSuggestion{}
	seen := map[string]bool{}

	maxAttempts := count * 20
	for attempts := 0; len(suggestions) < count && attempts < maxAttempts; attempts++ {
		top := pickWeightedStale(pools["Top"])
		bottom := pickWeightedStale(pools["Bottom"])
		shoes := pickWeightedStale(pools["Shoes"])

		items := []domain.ClothingItem{top, bottom, shoes}
		sig := comboSignature(items)
		if existing[sig] || seen[sig] {
			continue
		}
		seen[sig] = true

		suggestions = append(suggestions, domain.OutfitSuggestion{
			Items:  items,
			Reason: suggestionReason(items),
		})
	}

	return suggestions, nil
}

func (s *Store) loadStaleItemPools() (map[string][]domain.ClothingItem, error) {
	rows, err := s.db.Query(`
		SELECT id, category, sub_category, color_hex, material, image_url, raw_image_url, image_status, last_worn, created_at, updated_at
		FROM clothing_items
		WHERE category IN ('Top', 'Bottom', 'Shoes')
		ORDER BY last_worn ASC NULLS FIRST`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	pools := map[string][]domain.ClothingItem{}
	for rows.Next() {
		var item domain.ClothingItem
		if err := rows.Scan(&item.ID, &item.Category, &item.SubCategory, &item.ColorHex, &item.Material,
			&item.ImageURL, &item.RawImageURL, &item.ImageStatus, &item.LastWorn, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		pools[item.Category] = append(pools[item.Category], item)
	}
	return pools, rows.Err()
}

func (s *Store) loadOutfitSignatures() (map[string]bool, error) {
	rows, err := s.db.Query(`
		SELECT outfit_id, clothing_item_id
		FROM outfit_items
		ORDER BY outfit_id, clothing_item_id`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := map[uuid.UUID][]string{}
	for rows.Next() {
		var oid, iid uuid.UUID
		if err := rows.Scan(&oid, &iid); err != nil {
			return nil, err
		}
		groups[oid] = append(groups[oid], iid.String())
	}

	sigs := map[string]bool{}
	for _, ids := range groups {
		sort.Strings(ids)
		sigs[strings.Join(ids, "|")] = true
	}
	return sigs, rows.Err()
}

func comboSignature(items []domain.ClothingItem) string {
	ids := make([]string, len(items))
	for i, it := range items {
		ids[i] = it.ID.String()
	}
	sort.Strings(ids)
	return strings.Join(ids, "|")
}

// pickWeightedStale: bias toward stalest items but allow variety.
// Pool is pre-sorted oldest-worn first; sample from top portion with falloff.
func pickWeightedStale(pool []domain.ClothingItem) domain.ClothingItem {
	n := len(pool)
	window := n
	if window > 5 {
		window = 5
	}
	idx := rand.Intn(window)
	return pool[idx]
}

func suggestionReason(items []domain.ClothingItem) string {
	hasNeverWorn := false
	maxDays := 0
	now := time.Now()
	for _, it := range items {
		if it.LastWorn == nil {
			hasNeverWorn = true
			continue
		}
		d := int(now.Sub(*it.LastWorn).Hours() / 24)
		if d > maxDays {
			maxDays = d
		}
	}
	if hasNeverWorn {
		return "Includes never-worn pieces"
	}
	if maxDays > 30 {
		return "Items overdue for rotation"
	}
	return "Fresh combo to try"
}

// Outfit Logs

func (s *Store) LogOutfitWear(req domain.LogOutfitWearRequest) (*domain.OutfitLog, error) {
	// Find or create outfit from items
	var outfitID uuid.UUID
	if req.OutfitID != nil {
		outfitID = *req.OutfitID
	} else if len(req.ItemIDs) > 0 {
		outfit, err := s.FindOrCreateOutfitByItems(req.ItemIDs)
		if err != nil {
			return nil, err
		}
		outfitID = outfit.ID
	} else {
		return nil, fmt.Errorf("must provide either outfit_id or item_ids")
	}

	// Create log with outfit_id
	var log domain.OutfitLog
	err := s.db.QueryRow(`
		INSERT INTO outfit_logs (outfit_id, wear_date, notes)
		VALUES ($1, $2, $3)
		RETURNING id, outfit_id, wear_date, notes, created_at, updated_at`,
		outfitID, req.WearDate, req.Notes).
		Scan(&log.ID, &log.OutfitID, &log.WearDate, &log.Notes, &log.CreatedAt, &log.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Copy outfit items to outfit_log_items for historical tracking
	_, err = s.db.Exec(`
		INSERT INTO outfit_log_items (outfit_log_id, clothing_item_id)
		SELECT $1, clothing_item_id FROM outfit_items WHERE outfit_id = $2`,
		log.ID, outfitID)
	if err != nil {
		return nil, err
	}

	// Update last_worn timestamp on all items in this log
	_, err = s.db.Exec(`
		UPDATE clothing_items
		SET last_worn = $1
		WHERE id IN (
			SELECT clothing_item_id FROM outfit_items WHERE outfit_id = $2
		)`,
		req.WearDate, outfitID)
	if err != nil {
		return nil, err
	}

	// Update outfit wear tracking
	_, err = s.db.Exec(`
		UPDATE outfits
		SET usage_count = usage_count + 1, last_worn = $1
		WHERE id = $2`,
		req.WearDate, outfitID)
	if err != nil {
		return nil, err
	}

	// Load items from outfit
	itemRows, err := s.db.Query(`
		SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
		FROM clothing_items ci
		JOIN outfit_items oi ON oi.clothing_item_id = ci.id
		WHERE oi.outfit_id = $1`,
		outfitID)
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

func (s *Store) UpdateOutfitLog(logID uuid.UUID, notes string, itemIDs []uuid.UUID) (*domain.OutfitLog, error) {
	// Update the log
	_, err := s.db.Exec(`
		UPDATE outfit_logs
		SET notes = $1, updated_at = NOW()
		WHERE id = $2`,
		notes, logID)
	if err != nil {
		return nil, err
	}

	// Delete existing items for this log
	_, err = s.db.Exec(`
		DELETE FROM outfit_log_items WHERE outfit_log_id = $1`,
		logID)
	if err != nil {
		return nil, err
	}

	// Add new items
	for _, itemID := range itemIDs {
		_, err := s.db.Exec(`
			INSERT INTO outfit_log_items (outfit_log_id, clothing_item_id)
			VALUES ($1, $2)`,
			logID, itemID)
		if err != nil {
			return nil, err
		}
	}

	// Reload the log
	var log domain.OutfitLog
	err = s.db.QueryRow(`
		SELECT id, outfit_id, wear_date, notes, created_at, updated_at
		FROM outfit_logs
		WHERE id = $1`,
		logID).
		Scan(&log.ID, &log.OutfitID, &log.WearDate, &log.Notes, &log.CreatedAt, &log.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Load items from outfit_log_items
	itemRows, err := s.db.Query(`
		SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at
		FROM clothing_items ci
		JOIN outfit_log_items oli ON oli.clothing_item_id = ci.id
		WHERE oli.outfit_log_id = $1`,
		log.ID)
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

	return &log, nil
}

func (s *Store) DeleteOutfitLog(logID uuid.UUID) error {
	// Get the log details first
	var log domain.OutfitLog
	err := s.db.QueryRow(`
		SELECT id, outfit_id, wear_date, notes, created_at, updated_at
		FROM outfit_logs
		WHERE id = $1`,
		logID).
		Scan(&log.ID, &log.OutfitID, &log.WearDate, &log.Notes, &log.CreatedAt, &log.UpdatedAt)
	if err != nil {
		return err
	}

	// Get all items in this log for later update
	var itemIDs []uuid.UUID
	itemRows, err := s.db.Query(`
		SELECT clothing_item_id FROM outfit_log_items WHERE outfit_log_id = $1`,
		logID)
	if err != nil {
		return err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var itemID uuid.UUID
		if err := itemRows.Scan(&itemID); err != nil {
			return err
		}
		itemIDs = append(itemIDs, itemID)
	}

	if log.OutfitID == nil {
		// No outfit associated, just delete the log and update items
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

		// Update items' last_worn to most recent remaining log
		for _, itemID := range itemIDs {
			if err := s.recalculateItemLastWorn(itemID); err != nil {
				return err
			}
		}

		return nil
	}

	// Delete the log
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

	// Decrement outfit usage_count
	_, err = s.db.Exec(`
		UPDATE outfits
		SET usage_count = GREATEST(0, usage_count - 1)
		WHERE id = $1`,
		*log.OutfitID)
	if err != nil {
		return err
	}

	// Update outfit last_worn to the most recent remaining log (or NULL if none)
	var lastWorn *time.Time
	err = s.db.QueryRow(`
		SELECT MAX(wear_date) FROM outfit_logs WHERE outfit_id = $1`,
		*log.OutfitID).
		Scan(&lastWorn)
	if err != nil && err != sql.ErrNoRows {
		return err
	}

	_, err = s.db.Exec(`
		UPDATE outfits
		SET last_worn = $1
		WHERE id = $2`,
		lastWorn, *log.OutfitID)
	if err != nil {
		return err
	}

	// Update items' last_worn to most recent remaining log
	for _, itemID := range itemIDs {
		if err := s.recalculateItemLastWorn(itemID); err != nil {
			return err
		}
	}

	return nil
}

// Helper function to recalculate an item's last_worn based on remaining logs
func (s *Store) recalculateItemLastWorn(itemID uuid.UUID) error {
	var lastWorn *time.Time
	err := s.db.QueryRow(`
		SELECT MAX(oli.outfit_log_id) 
		FROM outfit_log_items oli
		WHERE oli.clothing_item_id = $1
		LIMIT 1`,
		itemID).
		Scan(&lastWorn)

	// Now get the actual wear_date from the most recent log containing this item
	err = s.db.QueryRow(`
		SELECT MAX(ol.wear_date)
		FROM outfit_log_items oli
		JOIN outfit_logs ol ON oli.outfit_log_id = ol.id
		WHERE oli.clothing_item_id = $1`,
		itemID).
		Scan(&lastWorn)

	if err != nil && err != sql.ErrNoRows {
		return err
	}

	_, err = s.db.Exec(`
		UPDATE clothing_items
		SET last_worn = $1
		WHERE id = $2`,
		lastWorn, itemID)
	return err
}

// DetectStaleItemData finds items whose last_worn doesn't match any actual log
type StaleItem struct {
	ItemID       uuid.UUID
	CurrentWorn  *time.Time
	ActualWorn   *time.Time
	LogCount     int
}

func (s *Store) DetectStaleItemData() ([]StaleItem, error) {
	rows, err := s.db.Query(`
		SELECT 
			ci.id,
			ci.last_worn,
			MAX(ol.wear_date) as actual_last_worn,
			COUNT(DISTINCT ol.id) as log_count
		FROM clothing_items ci
		LEFT JOIN outfit_log_items oli ON ci.id = oli.clothing_item_id
		LEFT JOIN outfit_logs ol ON oli.outfit_log_id = ol.id
		WHERE ci.last_worn IS NOT NULL
		GROUP BY ci.id
		HAVING ci.last_worn > COALESCE(MAX(ol.wear_date), '1970-01-01'::date)
		   OR (MAX(ol.wear_date) IS NULL AND COUNT(DISTINCT ol.id) = 0)`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var staleItems []StaleItem
	for rows.Next() {
		var item StaleItem
		var logCount sql.NullInt64
		if err := rows.Scan(&item.ItemID, &item.CurrentWorn, &item.ActualWorn, &logCount); err != nil {
			return nil, err
		}
		if logCount.Valid {
			item.LogCount = int(logCount.Int64)
		}
		staleItems = append(staleItems, item)
	}

	return staleItems, rows.Err()
}

// FixStaleItemData corrects all items with stale last_worn data
func (s *Store) FixStaleItemData() (int, error) {
	staleItems, err := s.DetectStaleItemData()
	if err != nil {
		return 0, err
	}

	for _, item := range staleItems {
		if err := s.recalculateItemLastWorn(item.ItemID); err != nil {
			return 0, err
		}
	}

	return len(staleItems), nil
}

// Stats

func (s *Store) GetItemStats(id uuid.UUID) (*domain.ItemStats, error) {
	var stats domain.ItemStats
	err := s.db.QueryRow(`
		SELECT 
			COUNT(DISTINCT oi.outfit_id) as outfit_count,
			COUNT(DISTINCT oli.outfit_log_id) as wear_count,
			(SELECT last_worn FROM clothing_items WHERE id = $1) as last_worn
		FROM clothing_items ci
		LEFT JOIN outfit_items oi ON ci.id = oi.clothing_item_id
		LEFT JOIN outfit_log_items oli ON ci.id = oli.clothing_item_id
		WHERE ci.id = $1`, id).Scan(&stats.OutfitCount, &stats.WearCount, &stats.LastWorn)
	if err == sql.ErrNoRows {
		return nil, err
	}
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (s *Store) GetWardrobeStats() (*domain.WardrobeStats, error) {
	stats := &domain.WardrobeStats{}

	// Total items
	err := s.db.QueryRow(`SELECT COUNT(*) FROM clothing_items`).Scan(&stats.TotalItems)
	if err != nil {
		return nil, err
	}

	// Total outfits
	err = s.db.QueryRow(`SELECT COUNT(*) FROM outfits`).Scan(&stats.TotalOutfits)
	if err != nil {
		return nil, err
	}

	// Total wears
	err = s.db.QueryRow(`SELECT COUNT(*) FROM outfit_logs`).Scan(&stats.TotalWears)
	if err != nil {
		return nil, err
	}

	// Items by category
	rows, err := s.db.Query(`
		SELECT category, COUNT(*) 
		FROM clothing_items 
		GROUP BY category 
		ORDER BY category`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats.ItemsByCategory = []domain.CategoryCount{}
	for rows.Next() {
		var cat domain.CategoryCount
		if err := rows.Scan(&cat.Category, &cat.Count); err != nil {
			return nil, err
		}
		stats.ItemsByCategory = append(stats.ItemsByCategory, cat)
	}

	// Never worn items
	err = s.db.QueryRow(`SELECT COUNT(*) FROM clothing_items WHERE last_worn IS NULL`).Scan(&stats.NeverWornItems)
	if err != nil {
		return nil, err
	}

	// Never worn outfits
	err = s.db.QueryRow(`
		SELECT COUNT(*) FROM outfits o
		WHERE NOT EXISTS (
			SELECT 1 FROM outfit_logs ol WHERE ol.outfit_id = o.id
		)`).Scan(&stats.NeverWornOutfits)
	if err != nil {
		return nil, err
	}

	// Avg wears per outfit
	err = s.db.QueryRow(`
		SELECT COALESCE(AVG(wear_count), 0)
		FROM (
			SELECT COUNT(*) as wear_count
			FROM outfit_logs
			GROUP BY outfit_id
		) t`).Scan(&stats.AvgWearsPerOutfit)
	if err != nil {
		return nil, err
	}

	// Wears this month
	err = s.db.QueryRow(`
		SELECT COUNT(*) FROM outfit_logs 
		WHERE DATE_TRUNC('month', wear_date) = DATE_TRUNC('month', CURRENT_DATE)`).Scan(&stats.WearsThisMonth)
	if err != nil {
		return nil, err
	}

	// Wears by day of week
	rows, err = s.db.Query(`
		SELECT EXTRACT(DOW FROM wear_date)::int as day, COUNT(*) as count
		FROM outfit_logs
		GROUP BY EXTRACT(DOW FROM wear_date)
		ORDER BY day`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats.WearsByDayOfWeek = []domain.DayOfWeekCount{}
	for rows.Next() {
		var doc domain.DayOfWeekCount
		if err := rows.Scan(&doc.Day, &doc.Count); err != nil {
			return nil, err
		}
		stats.WearsByDayOfWeek = append(stats.WearsByDayOfWeek, doc)
	}

	// Top worn items
	rows, err = s.db.Query(`
		SELECT ci.id, ci.category, ci.sub_category, ci.color_hex, ci.material, ci.image_url, ci.raw_image_url, ci.image_status, ci.last_worn, ci.created_at, ci.updated_at, COUNT(ol.id) as wear_count
		FROM clothing_items ci
		LEFT JOIN outfit_log_items oli ON ci.id = oli.clothing_item_id
		LEFT JOIN outfit_logs ol ON oli.outfit_log_id = ol.id
		GROUP BY ci.id
		ORDER BY COUNT(ol.id) DESC
		LIMIT 5`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats.TopWornItems = []domain.TopItem{}
	for rows.Next() {
		var ti domain.TopItem
		if err := rows.Scan(&ti.Item.ID, &ti.Item.Category, &ti.Item.SubCategory, &ti.Item.ColorHex, &ti.Item.Material,
			&ti.Item.ImageURL, &ti.Item.RawImageURL, &ti.Item.ImageStatus, &ti.Item.LastWorn, &ti.Item.CreatedAt, &ti.Item.UpdatedAt, &ti.WearCount); err != nil {
			return nil, err
		}
		stats.TopWornItems = append(stats.TopWornItems, ti)
	}

	// Color palette
	rows, err = s.db.Query(`
		SELECT DISTINCT color_hex FROM clothing_items WHERE color_hex IS NOT NULL AND color_hex != '' ORDER BY color_hex`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats.Colors = []string{}
	for rows.Next() {
		var color string
		if err := rows.Scan(&color); err != nil {
			return nil, err
		}
		stats.Colors = append(stats.Colors, color)
	}

	return stats, nil
}
