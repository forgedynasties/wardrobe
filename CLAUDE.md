# Wardrobe

Go backend + Next.js frontend. Digital wardrobe manager.

## Stack

- **Backend:** Go, Gin, PostgreSQL
- **Frontend:** Next.js (Phase 3)
- **Images:** PNG only, no background (pre-cleaned)
- **Storage:** Local `/uploads` dir (for now)

## Architecture

```
cmd/server/       - entrypoint
internal/domain/  - structs (ClothingItem, Outfit)
internal/vision/  - image processing / vision API
internal/storage/ - image storage layer
internal/api/     - HTTP handlers + routes
```

## Data Model

- **ClothingItem** (atom): category, subcategory, color_hex, material, image paths, last_worn
- **Outfit** (molecule): name, items (M2M), season, vibe tags, usage_count

## Conventions

- UUID primary keys
- JSON API responses
- Goroutine worker pool for async image processing
- Images stored as PNG without background
- Mobile-first UX priority

## Commands

```bash
go run cmd/server/main.go    # run server
go test ./...                # run tests
```
