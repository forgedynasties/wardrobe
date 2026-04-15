package domain

import (
	"time"

	"github.com/google/uuid"
)

type ClothingItem struct {
	ID          uuid.UUID  `json:"id"`
	Category    string     `json:"category"`
	SubCategory string     `json:"sub_category"`
	ColorHex    string     `json:"color_hex"`
	Material    string     `json:"material"`
	ImageURL    string     `json:"image_url"`
	RawImageURL string     `json:"raw_image_url"`
	ImageStatus string     `json:"image_status"`
	LastWorn    *time.Time `json:"last_worn"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

type ImageJob struct {
	ItemID  uuid.UUID
	RawPath string
}

type Outfit struct {
	ID         uuid.UUID      `json:"id"`
	Name       string         `json:"name"`
	Season     string         `json:"season"`
	Vibe       []string       `json:"vibe"`
	UsageCount int            `json:"usage_count"`
	LastWorn   *time.Time     `json:"last_worn"`
	Items      []ClothingItem `json:"items,omitempty"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}

type CreateItemRequest struct {
	Category    string `json:"category" binding:"required"`
	SubCategory string `json:"sub_category"`
	ColorHex    string `json:"color_hex"`
	Material    string `json:"material"`
	ImageURL    string `json:"image_url"`
	RawImageURL string `json:"raw_image_url"`
}

type UpdateItemRequest struct {
	Category    *string `json:"category"`
	SubCategory *string `json:"sub_category"`
	ColorHex    *string `json:"color_hex"`
	Material    *string `json:"material"`
	ImageURL    *string `json:"image_url"`
	RawImageURL *string `json:"raw_image_url"`
}

type CreateOutfitRequest struct {
	Name   string   `json:"name" binding:"required"`
	Season string   `json:"season"`
	Vibe   []string `json:"vibe"`
}

type UpdateOutfitRequest struct {
	Name   *string  `json:"name"`
	Season *string  `json:"season"`
	Vibe   []string `json:"vibe"`
}

type AddOutfitItemRequest struct {
	ClothingItemID uuid.UUID `json:"clothing_item_id" binding:"required"`
}
