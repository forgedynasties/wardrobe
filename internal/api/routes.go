package api

import "github.com/gin-gonic/gin"

func RegisterRoutes(r *gin.Engine, h *Handler) {
	api := r.Group("/api")

	items := api.Group("/items")
	{
		items.GET("", h.ListItems)
		items.GET("/:id", h.GetItem)
		items.POST("", h.CreateItem)
		items.PUT("/:id", h.UpdateItem)
		items.DELETE("/:id", h.DeleteItem)
		items.POST("/:id/image", h.UploadImage)
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
}
