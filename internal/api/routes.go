package api

import (
	"strings"

	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, h *Handler) {
	// CORS is already handled by the cors middleware in main.go

	// Owner scope: two-user app (Ali / Alishba). Default to "ali" so legacy
	// clients and the raw-image static handler keep working.
	r.Use(func(c *gin.Context) {
		owner := strings.ToLower(strings.TrimSpace(c.GetHeader("X-User")))
		if owner != "alishba" {
			owner = "ali"
		}
		c.Set("owner", owner)
		c.Next()
	})

	api := r.Group("/api")

	items := api.Group("/items")
	{
		items.GET("", h.ListItems)
		items.GET("/:id", h.GetItem)
		items.POST("", h.CreateItem)
		items.PUT("/:id", h.UpdateItem)
		items.DELETE("/:id", h.DeleteItem)
		items.POST("/:id/image", h.UploadImage)
		items.GET("/:id/stats", h.GetItemStats)
	}


	outfits := api.Group("/outfits")
	{
		outfits.GET("", h.ListOutfits)
		outfits.GET("/recommendations", h.RecommendOutfits)
		outfits.GET("/suggestions", h.SuggestOutfits)
		outfits.GET("/:id", h.GetOutfit)
		outfits.POST("", h.CreateOutfit)
		outfits.PUT("/:id", h.UpdateOutfit)
		outfits.DELETE("/:id", h.DeleteOutfit)
		outfits.POST("/:id/wear", h.WearOutfit)
		outfits.PUT("/:id/layout", h.UpdateOutfitLayout)
		outfits.POST("/:id/items", h.AddOutfitItem)
		outfits.DELETE("/:id/items/:itemId", h.RemoveOutfitItem)
	}

	logs := api.Group("/outfit-logs")
	{
		logs.POST("", h.LogOutfitWear)
		logs.GET("", h.GetOutfitLogs)
		logs.GET("/:date", h.GetOutfitLogByDate)
		logs.PUT("/:id", h.UpdateOutfitLog)
		logs.DELETE("/:id", h.DeleteOutfitLog)
	}

	stats := api.Group("/stats")
	{
		stats.GET("", h.GetWardrobeStats)
		stats.GET("/utility/stale-data", h.DetectStaleData)
		stats.POST("/utility/fix-stale-data", h.FixStaleData)
	}

	api.POST("/admin/recrop-images", h.RecropAllImages)
}
