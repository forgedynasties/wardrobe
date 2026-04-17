package domain

import (
	"time"

	"github.com/google/uuid"
)

type ClothingItem struct {
	ID           uuid.UUID  `json:"id"`
	Category     string     `json:"category"`
	SubCategory  string     `json:"sub_category"`
	Colors       []string   `json:"colors"`
	Material     string     `json:"material"`
	ImageURL     string     `json:"image_url"`
	RawImageURL  string     `json:"raw_image_url"`
	ImageStatus  string     `json:"image_status"`
	DisplayScale float64    `json:"display_scale"`
	LastWorn     *time.Time `json:"last_worn"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

type ImageJob struct {
	ItemID  uuid.UUID
	RawPath string
}

type OutfitItem struct {
	ClothingItem
	PositionX float64 `json:"position_x"`
	PositionY float64 `json:"position_y"`
	Scale     float64 `json:"scale"`
	ZIndex    int     `json:"z_index"`
}

type Outfit struct {
	ID         uuid.UUID    `json:"id"`
	Name       string       `json:"name"`
	UsageCount int          `json:"usage_count"`
	LastWorn   *time.Time   `json:"last_worn"`
	Items      []OutfitItem `json:"items,omitempty"`
	CreatedAt  time.Time    `json:"created_at"`
	UpdatedAt  time.Time    `json:"updated_at"`
}

type OutfitItemLayout struct {
	ClothingItemID uuid.UUID `json:"clothing_item_id" binding:"required"`
	PositionX      float64   `json:"position_x"`
	PositionY      float64   `json:"position_y"`
	Scale          float64   `json:"scale"`
	ZIndex         int       `json:"z_index"`
}

type UpdateOutfitLayoutRequest struct {
	Items []OutfitItemLayout `json:"items" binding:"required"`
}

type CreateItemRequest struct {
	Category    string   `json:"category" binding:"required"`
	SubCategory string   `json:"sub_category"`
	Colors      []string `json:"colors"`
	Material    string   `json:"material"`
	ImageURL    string   `json:"image_url"`
	RawImageURL string   `json:"raw_image_url"`
}

type UpdateItemRequest struct {
	Category     *string  `json:"category"`
	SubCategory  *string  `json:"sub_category"`
	Colors       []string `json:"colors"`
	Material     *string  `json:"material"`
	ImageURL     *string  `json:"image_url"`
	RawImageURL  *string  `json:"raw_image_url"`
	DisplayScale *float64 `json:"display_scale"`
}

type CreateOutfitRequest struct {
	Name string `json:"name"`
}

type UpdateOutfitRequest struct {
	Name *string `json:"name"`
}

type AddOutfitItemRequest struct {
	ClothingItemID uuid.UUID `json:"clothing_item_id" binding:"required"`
}
type OutfitLog struct {
	ID       uuid.UUID      `json:"id"`
	OutfitID *uuid.UUID     `json:"outfit_id"`
	WearDate time.Time      `json:"wear_date"`
	Notes    string         `json:"notes"`
	Items    []ClothingItem `json:"items,omitempty"`
	CreatedAt time.Time     `json:"created_at"`
	UpdatedAt time.Time     `json:"updated_at"`
}

type LogOutfitWearRequest struct {
	OutfitID   *uuid.UUID  `json:"outfit_id"`
	WearDate   time.Time   `json:"wear_date" binding:"required"`
	ItemIDs    []uuid.UUID `json:"item_ids"`
	Notes      string      `json:"notes"`
}

type GetOutfitLogsRequest struct {
	StartDate time.Time `json:"start_date" binding:"required"`
	EndDate   time.Time `json:"end_date" binding:"required"`
}

type OutfitRecommendation struct {
	Outfit
	Score  float64 `json:"score"`
	Reason string  `json:"reason"`
}

type OutfitSuggestion struct {
	Items  []ClothingItem `json:"items"`
	Reason string         `json:"reason"`
}

type ItemStats struct {
	OutfitCount int        `json:"outfit_count"`
	WearCount   int        `json:"wear_count"`
	LastWorn    *time.Time `json:"last_worn"`
}

type CategoryCount struct {
	Category string `json:"category"`
	Count    int    `json:"count"`
}

type DayOfWeekCount struct {
	Day   int `json:"day"`
	Count int `json:"count"`
}

type TopItem struct {
	Item      ClothingItem `json:"item"`
	WearCount int          `json:"wear_count"`
}

type WardrobeStats struct {
	TotalItems      int              `json:"total_items"`
	TotalOutfits    int              `json:"total_outfits"`
	TotalWears      int              `json:"total_wears"`
	ItemsByCategory []CategoryCount  `json:"items_by_category"`
	NeverWornItems  int              `json:"never_worn_items"`
	NeverWornOutfits int             `json:"never_worn_outfits"`
	AvgWearsPerOutfit float64        `json:"avg_wears_per_outfit"`
	WearsThisMonth  int              `json:"wears_this_month"`
	WearsByDayOfWeek []DayOfWeekCount `json:"wears_by_day_of_week"`
	TopWornItems    []TopItem        `json:"top_worn_items"`
	Colors          []string         `json:"colors"`
}