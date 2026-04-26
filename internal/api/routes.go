package api

import (
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(r *gin.Engine, h *Handler) {
	api := r.Group("/api")

	// Public auth routes (no session required)
	auth := api.Group("/auth")
	{
		auth.POST("/login", h.Login)
		auth.POST("/logout", h.Logout)
		auth.POST("/register", h.Register)
		auth.GET("/me", h.AuthMiddleware(), h.Me)
		auth.PUT("/password", h.AuthMiddleware(), h.ChangePassword)
	}

	// Public endpoints (no auth)
	api.GET("/profile/public/:username", h.GetPublicProfile)
	api.GET("/profile/public/:username/items/:id", h.GetPublicItem)
	api.GET("/profile/public/:username/outfits/:id", h.GetPublicOutfit)

	// All other routes require a valid session
	protected := api.Group("", h.AuthMiddleware())
	{
		protected.GET("/image/*filepath", h.ServeImage)

		items := protected.Group("/items")
		{
			items.GET("", h.ListItems)
			items.GET("/:id", h.GetItem)
			items.POST("", h.CreateItem)
			items.PUT("/:id", h.UpdateItem)
			items.DELETE("/:id", h.DeleteItem)
			items.POST("/:id/image", h.UploadImage)
			items.GET("/:id/stats", h.GetItemStats)
		}

		wishlist := protected.Group("/wishlist")
		{
			wishlist.GET("", h.ListWishlistItems)
			wishlist.POST("", h.CreateWishlistItem)
			wishlist.PATCH("/:id", h.UpdateWishlistItem)
			wishlist.DELETE("/:id", h.DeleteWishlistItem)
		}

		outfits := protected.Group("/outfits")
		{
			outfits.GET("", h.ListOutfits)
			outfits.GET("/recommendations", h.RecommendOutfits)
			outfits.GET("/suggestions", h.SuggestOutfits)
			outfits.GET("/:id", h.GetOutfit)
			outfits.POST("", h.CreateOutfit)
			outfits.PUT("/:id", h.UpdateOutfit)
			outfits.DELETE("/:id", h.DeleteOutfit)
			outfits.PUT("/:id/layout", h.UpdateOutfitLayout)
			outfits.POST("/:id/wear", h.WearOutfit)
			outfits.POST("/:id/items", h.AddOutfitItem)
			outfits.DELETE("/:id/items/:itemId", h.RemoveOutfitItem)
		}

		logs := protected.Group("/outfit-logs")
		{
			logs.POST("", h.LogOutfitWear)
			logs.GET("", h.GetOutfitLogs)
			logs.GET("/:date", h.GetOutfitLogByDate)
			logs.PUT("/:id", h.UpdateOutfitLog)
			logs.DELETE("/:id", h.DeleteOutfitLog)
		}

		stats := protected.Group("/stats")
		{
			stats.GET("", h.GetWardrobeStats)
			stats.GET("/wear-heatmap", h.GetWearHeatmap)
			stats.GET("/utility/stale-data", h.DetectStaleData)
			stats.POST("/utility/fix-stale-data", h.FixStaleData)
		}

		profile := protected.Group("/profile")
		{
			profile.GET("/settings", h.GetProfileSettings)
			profile.PUT("/settings", h.SetProfileSettings)
		}

		protected.GET("/config/outfit", h.GetOutfitConfig)
		protected.PUT("/config/outfit", h.SetOutfitConfig)

		admin := protected.Group("/admin")
		{
			admin.POST("/recrop-images", h.RecropAllImages)
			admin.GET("/users", h.ListUsers)
			admin.PUT("/users/:username/password", h.AdminResetPassword)
			admin.PUT("/users/:username/active", h.SetUserActive)
		}
	}
}
