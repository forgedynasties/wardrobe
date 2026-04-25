package api

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"wardrobe/internal/domain"
)

const outfitConfigKey = "outfit_config"

func (h *Handler) GetOutfitConfig(c *gin.Context) {
	val, err := h.store.GetConfig(outfitConfigKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server error"})
		return
	}
	if val == nil {
		c.JSON(http.StatusNoContent, nil)
		return
	}
	c.Data(http.StatusOK, "application/json", val)
}

func (h *Handler) SetOutfitConfig(c *gin.Context) {
	user := c.MustGet("user").(*domain.User)
	if !user.IsAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "admin only"})
		return
	}
	body, err := c.GetRawData()
	if err != nil || !json.Valid(body) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid JSON"})
		return
	}
	if err := h.store.SetConfig(outfitConfigKey, json.RawMessage(body)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "server error"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ok": true})
}
