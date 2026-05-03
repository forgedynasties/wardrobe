package api

import (
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"hangur/internal/cache"
	"hangur/internal/domain"
	"hangur/internal/email"
	"hangur/internal/storage"
	"hangur/internal/vision"
)

type Handler struct {
	store      *storage.Store
	imageStore *storage.ImageStore
	worker     *vision.Worker
	mailer     *email.Sender
	statsCache *cache.TTLCache[string, *domain.HangurStats]
	recsCache  *cache.TTLCache[string, []domain.OutfitRecommendation]
}

func NewHandler(store *storage.Store, imageStore *storage.ImageStore, worker *vision.Worker, mailer *email.Sender) *Handler {
	return &Handler{
		store:      store,
		imageStore: imageStore,
		worker:     worker,
		mailer:     mailer,
		statsCache: cache.New[string, *domain.HangurStats](60 * time.Second),
		recsCache:  cache.New[string, []domain.OutfitRecommendation](5 * time.Minute),
	}
}

// etagCheck computes an ETag from the owner's latest updated_at and handles
// conditional GET. Returns true if the response was short-circuited (304).
func (h *Handler) etagCheck(c *gin.Context, owner string) bool {
	t, err := h.store.LatestUpdatedAt(owner)
	if err != nil {
		return false
	}
	etag := fmt.Sprintf(`"%x"`, md5.Sum([]byte(t.UTC().String())))
	c.Header("ETag", etag)
	c.Header("Cache-Control", "private, no-cache")
	if c.GetHeader("If-None-Match") == etag {
		c.Status(http.StatusNotModified)
		return true
	}
	return false
}

// parsePage reads ?limit and ?after (RFC3339 timestamp cursor) from the request.
// limit=0 means no limit (all rows). after=nil means start from the beginning.
func parsePage(c *gin.Context) (limit int, after *time.Time) {
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if v := c.Query("after"); v != "" {
		if t, err := time.Parse(time.RFC3339Nano, v); err == nil {
			after = &t
		}
	}
	return
}

// pageResponse returns items as a plain array (no limit) or a paginated envelope.
// No limit → plain array, preserving backward compat with existing frontend calls.
// With limit → { data: [...], next_cursor: "..." } when more pages exist.
func pageResponse[T any](items []T, limit int, createdAt func(int) time.Time) any {
	if limit == 0 {
		return items
	}
	type envelope struct {
		Data       []T    `json:"data"`
		NextCursor string `json:"next_cursor,omitempty"`
	}
	env := envelope{Data: items}
	if len(items) == limit {
		env.NextCursor = createdAt(len(items) - 1).UTC().Format(time.RFC3339Nano)
	}
	return env
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
	if h.etagCheck(c, owner) {
		return
	}
	limit, after := parsePage(c)
	items, err := h.store.ListItems(owner, limit, after)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if items == nil {
		items = []domain.ClothingItem{}
	}
	c.JSON(http.StatusOK, pageResponse(items, limit, func(i int) time.Time { return items[i].CreatedAt }))
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

func (h *Handler) FetchWishlistMeta(c *gin.Context) {
	rawURL := c.Query("url")
	if rawURL == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "url required"})
		return
	}

	client := &http.Client{Timeout: 8 * time.Second}
	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid url"})
		return
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; Hangur/1.0; +https://hangur.app)")
	req.Header.Set("Accept", "text/html,application/xhtml+xml")

	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not fetch url"})
		return
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 512*1024))
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"error": "could not read response"})
		return
	}
	html := strings.ToLower(string(body))

	extractMeta := func(props ...string) string {
		for _, prop := range props {
			needle := `property="` + prop + `"`
			if idx := strings.Index(html, needle); idx != -1 {
				rest := html[idx+len(needle):]
				if ci := strings.Index(rest, `content="`); ci != -1 {
					rest = rest[ci+len(`content="`):]
					if end := strings.Index(rest, `"`); end != -1 {
						return strings.TrimSpace(string(body)[idx+len(needle):][ci+len(`content="`) : ci+len(`content="`)+end])
					}
				}
			}
			needle2 := `name="` + prop + `"`
			if idx := strings.Index(html, needle2); idx != -1 {
				rest := html[idx+len(needle2):]
				if ci := strings.Index(rest, `content="`); ci != -1 {
					rest = rest[ci+len(`content="`):]
					if end := strings.Index(rest, `"`); end != -1 {
						return strings.TrimSpace(string(body)[idx+len(needle2):][ci+len(`content="`) : ci+len(`content="`)+end])
					}
				}
			}
		}
		return ""
	}

	imageURL := extractMeta("og:image", "twitter:image")
	title := extractMeta("og:title", "twitter:title")
	priceStr := extractMeta("og:price:amount", "product:price:amount")
	currency := extractMeta("og:price:currency", "product:price:currency")

	// Fallback: <title> tag
	if title == "" {
		if ti := strings.Index(html, "<title>"); ti != -1 {
			rest := html[ti+7:]
			if end := strings.Index(rest, "</title>"); end != -1 {
				title = strings.TrimSpace(string(body)[ti+7 : ti+7+end])
			}
		}
	}

	// Fallback: JSON-LD schema.org Product offers
	if priceStr == "" || currency == "" {
		ldRe := regexp.MustCompile(`(?i)<script[^>]+type=["']application/ld\+json["'][^>]*>([\s\S]*?)</script>`)
		for _, match := range ldRe.FindAllSubmatch(body, -1) {
			if len(match) < 2 {
				continue
			}
			var obj map[string]any
			if err := json.Unmarshal(match[1], &obj); err != nil {
				continue
			}
			// unwrap @graph array if present
			if graph, ok := obj["@graph"].([]any); ok {
				for _, node := range graph {
					if m, ok := node.(map[string]any); ok {
						if p, c := extractSchemaPrice(m); p != "" || c != "" {
							if priceStr == "" { priceStr = p }
							if currency == "" { currency = c }
						}
					}
				}
			} else {
				p, c := extractSchemaPrice(obj)
				if priceStr == "" { priceStr = p }
				if currency == "" { currency = c }
			}
			if priceStr != "" && currency != "" {
				break
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"image_url": imageURL, "title": title, "price": priceStr, "currency": strings.ToUpper(currency)})
}

// extractSchemaPrice pulls price/priceCurrency from a schema.org Product or Offer node.
func extractSchemaPrice(obj map[string]any) (price, currency string) {
	getStr := func(m map[string]any, keys ...string) string {
		for _, k := range keys {
			if v, ok := m[k]; ok {
				switch s := v.(type) {
				case string:
					return s
				case float64:
					return strconv.FormatFloat(s, 'f', -1, 64)
				}
			}
		}
		return ""
	}

	// Direct Offer node
	if t, _ := obj["@type"].(string); strings.EqualFold(t, "offer") {
		return getStr(obj, "price"), getStr(obj, "priceCurrency")
	}

	// Product node — dig into offers
	offers := obj["offers"]
	if offers == nil {
		return
	}
	switch v := offers.(type) {
	case map[string]any:
		return getStr(v, "price"), getStr(v, "priceCurrency")
	case []any:
		for _, o := range v {
			if m, ok := o.(map[string]any); ok {
				p := getStr(m, "price")
				c := getStr(m, "priceCurrency")
				if p != "" || c != "" {
					return p, c
				}
			}
		}
	}
	return
}

func (h *Handler) ListWishlistItems(c *gin.Context) {
	owner := c.GetString("owner")
	limit, after := parsePage(c)
	items, err := h.store.ListWishlistItems(owner, limit, after)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if items == nil {
		items = []domain.WishlistItem{}
	}
	c.JSON(http.StatusOK, pageResponse(items, limit, func(i int) time.Time { return items[i].CreatedAt }))
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

func (h *Handler) UpdateWishlistItem(c *gin.Context) {
	owner := c.GetString("owner")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var req domain.UpdateWishlistItemRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	item, err := h.store.UpdateWishlistItem(id, owner, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
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
	if h.etagCheck(c, owner) {
		return
	}
	limit, after := parsePage(c)
	outfits, err := h.store.ListOutfits(owner, limit, after)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if outfits == nil {
		outfits = []domain.Outfit{}
	}
	c.JSON(http.StatusOK, pageResponse(outfits, limit, func(i int) time.Time { return outfits[i].CreatedAt }))
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

func (h *Handler) UpdateOutfitLayout(c *gin.Context) {
	owner := c.GetString("owner")
	outfitID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	var updates []domain.OutfitItemLayout
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.store.UpdateOutfitLayout(outfitID, owner, updates); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"error": "outfit not found"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	outfit, err := h.store.GetOutfit(outfitID, owner)
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

	// Write upload to a tmp file so we can resize before uploading to R2.
	tmp, err := os.CreateTemp("", "raw-"+id.String()+"-*.png")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create tmp"})
		return
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if _, err := io.Copy(tmp, file); err != nil {
		tmp.Close()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to buffer image"})
		return
	}
	tmp.Close()

	// Crop transparent padding so the item fills its bounding box.
	if err := vision.CropTransparent(tmpPath, 10); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to crop image"})
		return
	}

	// Resize raw to max 2000px before uploading (item 14).
	if err := vision.ResizePNG(tmpPath, 2000); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to resize image"})
		return
	}

	ctx := c.Request.Context()
	if err := h.imageStore.UploadRaw(ctx, id, tmpPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to upload image"})
		return
	}

	rawURL := h.imageStore.RawURL(id)

	thumbURL := ""
	thumbTmp := os.TempDir() + "/thumb-" + id.String() + ".png"
	defer os.Remove(thumbTmp)
	if err := vision.GenerateThumbnail(tmpPath, thumbTmp, 400); err == nil {
		if err := h.imageStore.UploadThumb(ctx, id, thumbTmp); err == nil {
			thumbURL = h.imageStore.ThumbURL(id)
		}
	}

	if err := h.store.UpdateImageStatus(id, "done", rawURL, rawURL, thumbURL); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update status"})
		return
	}

	colors, _ := vision.ExtractColors(tmpPath)
	if len(colors) > 0 {
		_ = h.store.UpdateItemColors(id, colors)
	}

	c.JSON(http.StatusOK, gin.H{
		"status":        "done",
		"raw_image_url": rawURL,
		"colors":        colors,
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

func (h *Handler) GetHangurStats(c *gin.Context) {
	owner := c.GetString("owner")
	if cached, ok := h.statsCache.Get(owner); ok {
		c.JSON(http.StatusOK, cached)
		return
	}
	stats, err := h.store.GetHangurStats(owner)
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
	items, err := h.store.ListItems(owner, 0, nil)
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

// Public item / outfit share

func (h *Handler) GetPublicItem(c *gin.Context) {
	username := c.Param("username")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	item, err := h.store.GetItem(id, username)
	if err == sql.ErrNoRows || item == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, item)
}

func (h *Handler) GetPublicOutfit(c *gin.Context) {
	username := c.Param("username")
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	outfit, err := h.store.GetOutfit(id, username)
	if err == sql.ErrNoRows || outfit == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, outfit)
}

// Profile

func (h *Handler) GetWearHeatmap(c *gin.Context) {
	owner := c.GetString("owner")
	year := time.Now().Year()
	if y, err := strconv.Atoi(c.Query("year")); err == nil && y > 2000 {
		year = y
	}
	entries, err := h.store.GetWearHeatmap(owner, year)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	if entries == nil {
		entries = []domain.HeatmapEntry{}
	}
	c.JSON(http.StatusOK, entries)
}

func (h *Handler) GetProfileSettings(c *gin.Context) {
	owner := c.GetString("owner")
	cfg, err := h.store.GetProfileConfig(owner)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func (h *Handler) SetProfileSettings(c *gin.Context) {
	owner := c.GetString("owner")
	var cfg domain.ProfileConfig
	if err := c.ShouldBindJSON(&cfg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := h.store.SetProfileConfig(owner, cfg); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, cfg)
}

func (h *Handler) GetPublicProfile(c *gin.Context) {
	username := c.Param("username")

	user, err := h.store.GetUserByUsername(username)
	if err != nil || user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "profile not found"})
		return
	}

	cfg, err := h.store.GetProfileConfig(username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	profile := domain.PublicProfile{
		DisplayName:  user.DisplayName,
		Username:     user.Username,
		AvatarColors: []string{},
		Sections:     cfg.Sections,
	}

	if colors, err := h.store.GetAvatarColors(username); err == nil {
		profile.AvatarColors = colors
	}

	s := cfg.Sections
	if s.Snapshot || s.Signature {
		if stats, err := h.store.GetHangurStats(username); err == nil {
			if s.Snapshot {
				profile.Snapshot = stats
			}
			if s.Signature {
				profile.Signature = stats.TopWornItems
			}
		}
	}

	if s.Outfits {
		if outfits, err := h.store.ListOutfits(username, 50, nil); err == nil {
			profile.Outfits = outfits
		}
	}

	if s.Calendar {
		year := time.Now().Year()
		if entries, err := h.store.GetWearHeatmap(username, year); err == nil {
			profile.Calendar = entries
			if profile.Calendar == nil {
				profile.Calendar = []domain.HeatmapEntry{}
			}
		}
		start := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
		end := time.Date(year, 12, 31, 23, 59, 59, 0, time.UTC)
		if logs, err := h.store.GetOutfitLogs(start, end, username); err == nil {
			profile.OutfitLogs = logs
		}
	}

	if s.Wishlist {
		if all, err := h.store.ListWishlistItems(username, 0, nil); err == nil {
			var visible []domain.WishlistItem
			for _, w := range all {
				if w.BoughtAt == nil {
					visible = append(visible, w)
				}
			}
			if visible == nil {
				visible = []domain.WishlistItem{}
			}
			profile.Wishlist = visible
		}
	}

	if items, err := h.store.ListItems(username, 0, nil); err == nil {
		if items == nil {
			items = []domain.ClothingItem{}
		}
		profile.Items = items
	}

	c.JSON(http.StatusOK, profile)
}

func (h *Handler) GetLeaderboard(c *gin.Context) {
	entries, err := h.store.GetLeaderboard()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, entries)
}
