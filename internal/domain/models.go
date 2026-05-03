package domain

import (
	"time"

	"github.com/google/uuid"
)

type ClothingItem struct {
	ID           uuid.UUID  `json:"id"`
	Name         string     `json:"name"`
	Brand        string     `json:"brand"`
	Category     string     `json:"category"`
	SubCategory  string     `json:"sub_category"`
	Colors       []string   `json:"colors"`
	Material     string     `json:"material"`
	ImageURL     string     `json:"image_url"`
	RawImageURL  string     `json:"raw_image_url"`
	ThumbnailURL string     `json:"thumbnail_url"`
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
	Rotation  float64 `json:"rotation"`
}

type OutfitItemLayout struct {
	ItemID    uuid.UUID `json:"item_id"`
	PositionX float64   `json:"position_x"`
	PositionY float64   `json:"position_y"`
	Scale     float64   `json:"scale"`
	ZIndex    int       `json:"z_index"`
	Rotation  float64   `json:"rotation"`
}

type Outfit struct {
	ID         uuid.UUID    `json:"id"`
	Name       string       `json:"name"`
	UsageCount int          `json:"usage_count"`
	LastWorn   *time.Time   `json:"last_worn"`
	Hidden     bool         `json:"hidden"`
	Pinned     bool         `json:"pinned"`
	Items      []OutfitItem `json:"items,omitempty"`
	CreatedAt  time.Time    `json:"created_at"`
	UpdatedAt  time.Time    `json:"updated_at"`
}


type CreateItemRequest struct {
	Name        string   `json:"name"`
	Brand       string   `json:"brand"`
	Category    string   `json:"category" binding:"required"`
	SubCategory string   `json:"sub_category"`
	Colors      []string `json:"colors"`
	Material    string   `json:"material"`
	ImageURL    string   `json:"image_url"`
	RawImageURL string   `json:"raw_image_url"`
}

type UpdateItemRequest struct {
	Name         *string  `json:"name"`
	Brand        *string  `json:"brand"`
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
	Name   *string `json:"name"`
	Hidden *bool   `json:"hidden"`
	Pinned *bool   `json:"pinned"`
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

type WishlistItem struct {
	ID         uuid.UUID  `json:"id"`
	Name       string     `json:"name"`
	ImageURL   string     `json:"image_url"`
	ProductURL string     `json:"product_url"`
	PricePKR   int64      `json:"price_pkr"`
	Priority   int        `json:"priority"`
	Notes      string     `json:"notes"`
	BoughtAt   *time.Time `json:"bought_at"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
}

type CreateWishlistItemRequest struct {
	Name       string `json:"name"`
	ImageURL   string `json:"image_url"`
	ProductURL string `json:"product_url" binding:"required"`
	PricePKR   int64  `json:"price_pkr"`
}

type UpdateWishlistItemRequest struct {
	Priority *int    `json:"priority"`
	Notes    *string `json:"notes"`
	Bought   *bool   `json:"bought"`
}

type ItemStats struct {
	OutfitCount int        `json:"outfit_count"`
	WearCount   int        `json:"wear_count"`
	LastWorn    *time.Time `json:"last_worn"`
}

type CategoryCount struct {
	Category string   `json:"category"`
	Count    int      `json:"count"`
	Colors   []string `json:"colors"`
}

type DayOfWeekCount struct {
	Day   int `json:"day"`
	Count int `json:"count"`
}

type User struct {
	ID           uuid.UUID `json:"id"`
	Username     string    `json:"username"`
	DisplayName  string    `json:"display_name"`
	PasswordHash string    `json:"-"`
	IsAdmin      bool      `json:"is_admin"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Session struct {
	ID          uuid.UUID `json:"id"`
	UserID      uuid.UUID `json:"user_id"`
	TokenHash   string    `json:"-"`
	ExpiresAt   time.Time `json:"expires_at"`
	LastUsedAt  time.Time `json:"last_used_at"`
	CreatedAt   time.Time `json:"created_at"`
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username    string `json:"username" binding:"required"`
	DisplayName string `json:"display_name" binding:"required"`
	Password    string `json:"password" binding:"required"`
}

type TopItem struct {
	Item      ClothingItem `json:"item"`
	WearCount int          `json:"wear_count"`
}

type HeatmapEntry struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type ProfileSections struct {
	Snapshot  bool `json:"snapshot"`
	Outfits   bool `json:"outfits"`
	Calendar  bool `json:"calendar"`
	Signature bool `json:"signature"`
	Wishlist  bool `json:"wishlist"`
}

type ProfileConfig struct {
	Sections ProfileSections `json:"sections"`
}

type PublicProfile struct {
	DisplayName  string           `json:"display_name"`
	Username     string           `json:"username"`
	AvatarColors []string         `json:"avatar_colors"`
	Sections     ProfileSections  `json:"sections"`
	Snapshot     *HangurStats     `json:"snapshot,omitempty"`
	Outfits      []Outfit         `json:"outfits,omitempty"`
	Calendar     []HeatmapEntry   `json:"calendar,omitempty"`
	OutfitLogs   []OutfitLog      `json:"outfit_logs,omitempty"`
	Signature    []TopItem        `json:"signature,omitempty"`
	Wishlist     []WishlistItem   `json:"wishlist,omitempty"`
	Items        []ClothingItem   `json:"items,omitempty"`
}

type LeaderboardEntry struct {
	Username    string   `json:"username"`
	DisplayName string   `json:"display_name"`
	AvatarColors []string `json:"avatar_colors"`
	TotalItems  int      `json:"total_items"`
	TotalOutfits int     `json:"total_outfits"`
	TotalWears  int      `json:"total_wears"`
}

type HangurStats struct {
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
