# Wardrobe

Digital wardrobe manager. Catalog clothing, build outfits, log daily wears, track stats.

**Stack:** Go + Gin + PostgreSQL (backend) · Next.js + Tailwind (frontend)

## Setup

Prerequisites: Go 1.21+, Node 18+, Docker.

```bash
git clone <repo-url>
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

- `DATABASE_URL` — Postgres connection string
- `PORT` — backend port (default `8081`)
- `NEXT_PUBLIC_API_URL` — backend URL for frontend (default `http://localhost:8081`)
