package api

import "github.com/gin-gonic/gin"

func RegisterRoutes(r *gin.Engine, h *Handler) {
	// Add CORS middleware to allow the frontend to communicate with the backend
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

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

	r.Static("/uploads", "./uploads")

	outfits := api.Group("/outfits")
	{
		outfits.GET("", h.ListOutfits)
		outfits.GET("/:id", h.GetOutfit)
		outfits.POST("", h.CreateOutfit)
		outfits.PUT("/:id", h.UpdateOutfit)
		outfits.DELETE("/:id", h.DeleteOutfit)
		outfits.POST("/:id/wear", h.WearOutfit)
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
}
