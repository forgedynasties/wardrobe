package api

import (
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"wardrobe/internal/cache"
	"wardrobe/internal/domain"
	"wardrobe/internal/storage"
	"wardrobe/internal/vision"
)

type Handler struct {
	store      *storage.Store
	imageStore *storage.ImageStore
	worker     *vision.Worker
	statsCache *cache.TTLCache[string, *domain.WardrobeStats]
	recsCache  *cache.TTLCache[string, []domain.OutfitRecommendation]
}

func NewHandler(store *storage.Store, imageStore *storage.ImageStore, worker *vision.Worker) *Handler {
	return &Handler{
		store:      store,
		imageStore: imageStore,
		worker:     worker,
		statsCache: cache.New[string, *domain.WardrobeStats](60 * time.Second),
		recsCache:  cache.New[string, []domain.OutfitRecommendation](5 * time.Minute),
	}
}

func (h *Handler) invalidateOutfitCaches(owner string) {
	h.statsCache.Delete(owner)
	// Invalidate all limit variants for this owner
	for _, limit := range []int{1, 2, 3, 4, 5, 10, 20, 50} {
		h.recsCache.Delete(fmt.Sprintf("%s:%d", owner, limit))
	}
}

// ServeImage proxies an R2 object through the API so clients inherit the
// backend's CORS configuration (needed for canvas-based export).
func (h *Handler) ServeImage(c *gin.Context) {
	key := strings.TrimPrefix(c.Param("filepath"), "/")
	if key == "" || (!strings.HasPrefix(key, "raw/") && !strings.HasPrefix(key, "clean/")) {
		c.Status(http.StatusBadRequest)
		return
	}
	body, err := h.imageStore.Fetch(c.Request.Context(), key)
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	defer body.Close()
	c.Header("Content-Type", "image/png")
	c.Header("Cache-Control", "public, max-age=3600")
	io.Copy(c.Writer, body)
}

// Items

func (h *Handler) ListItems(c *gin.Context) {
	owner := c.GetString("owner")
	items, err := h.store.ListItems(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if items == nil {
		items = []domain.ClothingItem{}
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) GetItem(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	item, err := h.store.GetItem(id, owner)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) CreateItem(c *gin.Context) {
	owner := c.GetString("owner")
	var req domain.CreateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := h.store.CreateItem(req, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) UpdateItem(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req domain.UpdateItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := h.store.UpdateItem(id, req, owner)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) DeleteItem(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.store.DeleteItem(id, owner); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

func (h *Handler) ListWishlistItems(c *gin.Context) {
	owner := c.GetString("owner")
	items, err := h.store.ListWishlistItems(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if items == nil {
		items = []domain.WishlistItem{}
	}
	c.JSON(http.StatusOK, items)
}

func (h *Handler) CreateWishlistItem(c *gin.Context) {
	owner := c.GetString("owner")
	var req domain.CreateWishlistItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := h.store.CreateWishlistItem(req, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, item)
}

func (h *Handler) DeleteWishlistItem(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.store.DeleteWishlistItem(id, owner); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}

// Outfits

func (h *Handler) ListOutfits(c *gin.Context) {
	owner := c.GetString("owner")
	outfits, err := h.store.ListOutfits(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if outfits == nil {
		outfits = []domain.Outfit{}
	}
	c.JSON(http.StatusOK, outfits)
}

func (h *Handler) GetOutfit(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	outfit, err := h.store.GetOutfit(id, owner)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, outfit)
}

func (h *Handler) CreateOutfit(c *gin.Context) {
	owner := c.GetString("owner")
	var req domain.CreateOutfitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Name == "" {
		req.Name = domain.RandomOutfitName()
	}
	outfit, err := h.store.CreateOutfit(req, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.invalidateOutfitCaches(owner)
	c.JSON(http.StatusCreated, outfit)
}

func (h *Handler) UpdateOutfit(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req domain.UpdateOutfitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	outfit, err := h.store.UpdateOutfit(id, req, owner)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, outfit)
}

func (h *Handler) DeleteOutfit(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.store.DeleteOutfit(id, owner); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	h.invalidateOutfitCaches(owner)
	c.JSON(http.StatusNoContent, nil)
}

func (h *Handler) AddOutfitItem(c *gin.Context) {
	owner := c.GetString("owner")
	outfitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid outfit id"})
		return
	}
	// Verify outfit belongs to owner before mutating.
	if _, err := h.store.GetOutfit(outfitID, owner); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "outfit not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	var req domain.AddOutfitItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	// Verify the item also belongs to owner so you can't smuggle foreign items in.
	if _, err := h.store.GetItem(req.ClothingItemID, owner); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := h.store.AddOutfitItem(outfitID, req.ClothingItemID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"status": "added"})
}

func (h *Handler) RemoveOutfitItem(c *gin.Context) {
	owner := c.GetString("owner")
	outfitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid outfit id"})
		return
	}
	itemID, err := uuid.Parse(c.Param("itemId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}
	if _, err := h.store.GetOutfit(outfitID, owner); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "outfit not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if err := h.store.RemoveOutfitItem(outfitID, itemID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

func (h *Handler) WearOutfit(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	outfit, err := h.store.WearOutfit(id, owner)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.invalidateOutfitCaches(owner)
	c.JSON(http.StatusOK, outfit)
}

func (h *Handler) RecommendOutfits(c *gin.Context) {
	owner := c.GetString("owner")
	limit := 5
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 50 {
			limit = n
		}
	}
	cacheKey := fmt.Sprintf("%s:%d", owner, limit)
	if cached, ok := h.recsCache.Get(cacheKey); ok {
		c.JSON(http.StatusOK, cached)
		return
	}
	recs, err := h.store.RecommendOutfits(limit, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if recs == nil {
		recs = []domain.OutfitRecommendation{}
	}
	h.recsCache.Set(cacheKey, recs)
	c.JSON(http.StatusOK, recs)
}

func (h *Handler) SuggestOutfits(c *gin.Context) {
	owner := c.GetString("owner")
	count := 3
	if v := c.Query("count"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 20 {
			count = n
		}
	}
	suggestions, err := h.store.SuggestOutfits(count, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if suggestions == nil {
		suggestions = []domain.OutfitSuggestion{}
	}
	c.JSON(http.StatusOK, suggestions)
}

// Image Upload

func (h *Handler) UploadImage(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if _, err := h.store.GetItem(id, owner); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	file, _, err := c.Request.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "image field required"})
		return
	}
	defer file.Close()

	tmpPath, err := h.imageStore.SaveRaw(c.Request.Context(), id, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save image"})
		return
	}
	defer os.Remove(tmpPath)

	rawURL := h.imageStore.RawURL(id)

	thumbURL := ""
	thumbTmp := os.TempDir() + "/thumb-" + id.String() + ".png"
	if err := vision.GenerateThumbnail(tmpPath, thumbTmp, 400); err == nil {
		defer os.Remove(thumbTmp)
		if err := h.imageStore.UploadThumb(c.Request.Context(), id, thumbTmp); err == nil {
			thumbURL = h.imageStore.ThumbURL(id)
		}
	}

	if err := h.store.UpdateImageStatus(id, "done", rawURL, rawURL, thumbURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "done",
		"raw_image_url": rawURL,
	})
}

// Outfit Logs

func (h *Handler) LogOutfitWear(c *gin.Context) {
	owner := c.GetString("owner")
	var req domain.LogOutfitWearRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	log, err := h.store.LogOutfitWear(req, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, log)
}

func (h *Handler) GetOutfitLogs(c *gin.Context) {
	owner := c.GetString("owner")
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	startDate, err := time.Parse("2006-01-02", startDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_date format (use YYYY-MM-DD)"})
		return
	}

	endDate, err := time.Parse("2006-01-02", endDateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_date format (use YYYY-MM-DD)"})
		return
	}

	logs, err := h.store.GetOutfitLogs(startDate, endDate, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if logs == nil {
		logs = []domain.OutfitLog{}
	}
	c.JSON(http.StatusOK, logs)
}

func (h *Handler) GetOutfitLogByDate(c *gin.Context) {
	owner := c.GetString("owner")
	dateStr := c.Param("date")
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format (use YYYY-MM-DD)"})
		return
	}

	log, err := h.store.GetOutfitLogByDate(date, owner)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "no log found for this date"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, log)
}

func (h *Handler) DeleteOutfitLog(c *gin.Context) {
	owner := c.GetString("owner")
	logID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := h.store.DeleteOutfitLog(logID, owner); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}

func (h *Handler) UpdateOutfitLog(c *gin.Context) {
	owner := c.GetString("owner")
	logID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		Notes   string      `json:"notes"`
		ItemIDs []uuid.UUID `json:"item_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log, err := h.store.UpdateOutfitLog(logID, req.Notes, req.ItemIDs, owner)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "log not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, log)
}

// Stats

func (h *Handler) GetItemStats(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	stats, err := h.store.GetItemStats(id, owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, stats)
}

func (h *Handler) GetWardrobeStats(c *gin.Context) {
	owner := c.GetString("owner")
	if cached, ok := h.statsCache.Get(owner); ok {
		c.JSON(http.StatusOK, cached)
		return
	}
	stats, err := h.store.GetWardrobeStats(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	h.statsCache.Set(owner, stats)
	c.JSON(http.StatusOK, stats)
}

// Utility endpoints

func (h *Handler) DetectStaleData(c *gin.Context) {
	owner := c.GetString("owner")
	staleItems, err := h.store.DetectStaleItemData(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"stale_items_count": len(staleItems),
		"stale_items":       staleItems,
	})
}

func (h *Handler) FixStaleData(c *gin.Context) {
	owner := c.GetString("owner")
	fixedCount, err := h.store.FixStaleItemData(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"fixed_items_count": fixedCount,
		"message":           fmt.Sprintf("Fixed %d stale items", fixedCount),
	})
}

func (h *Handler) RecropAllImages(c *gin.Context) {
	owner := c.GetString("owner")
	ctx := c.Request.Context()
	items, err := h.store.ListItems(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	cropped, failed := 0, 0
	for _, it := range items {
		if it.ImageStatus != "done" {
			continue
		}
		tmp, err := h.imageStore.DownloadClean(ctx, it.ID)
		if err != nil {
			failed++
			continue
		}
		if err := vision.CropTransparent(tmp, 8); err != nil {
			os.Remove(tmp)
			failed++
			continue
		}
		if err := h.imageStore.UploadClean(ctx, it.ID, tmp); err != nil {
			os.Remove(tmp)
			failed++
			continue
		}
		os.Remove(tmp)
		cropped++
	}
	c.JSON(http.StatusOK, gin.H{"cropped": cropped, "failed": failed})
}
