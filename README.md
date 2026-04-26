# Wardrobe

Digital wardrobe manager. Catalog clothing, build outfits, log daily wears, track stats.

**Stack:** Go + Gin + PostgreSQL (backend) · Next.js + Tailwind (frontend) · Cloudflare R2 (image storage)

## Features

- **Wardrobe** — catalog clothing items with auto background removal and color extraction
- **Outfits** — build outfit canvases from wardrobe items; pin or hide from gallery
- **Wear logger** — log daily wears, track usage count and last worn per item/outfit
- **Profile** — stats overview, wear heatmap, outfit gallery, signature pieces, never-worn callout, color spectrum
- **Public profiles** — shareable `/p/:username` pages with configurable section visibility
- **Wishlist** — track items to buy with priority, price, and product link
- **Recommendations** — score-based outfit suggestions from wear history

## Setup

Prerequisites: Go 1.21+, Node 18+, Docker.

```bash
git clone https://github.com/forgedynasties/wardrobe
cd wardrobe
./run.sh
```

Starts Postgres, runs migrations, boots backend on `:8081` and frontend on `:3000`.

### Manual

```bash
# backend
go mod download
go run cmd/server/main.go

# frontend
cd web && npm install && npm run dev
```

### Env

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string |
| `PORT` | no | Backend port (default `8081`) |
| `NEXT_PUBLIC_API_URL` | no | Backend URL for frontend (default `http://localhost:8081`) |
| `R2_ACCOUNT_ID` | yes* | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | yes* | R2 access key |
| `R2_SECRET_ACCESS_KEY` | yes* | R2 secret key |
| `R2_BUCKET` | yes* | R2 bucket name |
| `R2_PUBLIC_URL` | yes* | Public base URL for R2 assets |

\* Required for image upload. Falls back to local `/uploads` dir if unset.

## Architecture

```
cmd/server/       — entrypoint, migration runner
internal/domain/  — models (ClothingItem, Outfit, OutfitLog, …)
internal/api/     — HTTP handlers + routes (Gin)
internal/storage/ — Postgres queries, R2 image storage
internal/vision/  — background removal, color extraction
web/              — Next.js frontend
migrations/       — golang-migrate SQL files
```
