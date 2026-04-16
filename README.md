# Wardrobe - Digital Wardrobe Manager

A full-stack application for managing your digital wardrobe, organizing clothing items into outfits, and tracking what you wear over time.

## 🎯 Overview

Wardrobe is a personal wardrobe management system that helps you:
- Catalog your clothing items with images
- Create and organize outfits
- Log what you wear each day
- Track outfit usage frequency
- Get insights into your wearing patterns
- Discover your most and least worn items

## 🛠 Tech Stack

### Backend
- **Language**: Go
- **Framework**: Gin (HTTP web framework)
- **Database**: PostgreSQL
- **Image Processing**: Vision API with goroutine worker pool
- **Storage**: Local filesystem (`/uploads`)

### Frontend
- **Framework**: Next.js 16+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: React with Shadcn/ui
- **State Management**: React Hooks

## 📁 Project Structure

```
wardrobe/
├── cmd/
│   └── server/              # Server entrypoint
│       └── main.go
├── internal/
│   ├── api/                 # HTTP handlers and routes
│   │   ├── handlers.go
│   │   └── routes.go
│   ├── domain/              # Data models
│   │   └── models.go
│   ├── storage/             # Database layer
│   │   ├── postgres.go
│   │   └── images.go
│   └── vision/              # Image processing
│       └── worker.go
├── migrations/              # Database migrations
├── web/                     # Next.js frontend
│   ├── app/                 # App pages and routes
│   ├── components/          # React components
│   ├── lib/                 # Utility functions and API client
│   └── public/              # Static assets
├── uploads/                 # Image storage
│   ├── clean/               # Processed images (no background)
│   └── raw/                 # Original uploaded images
├── docker-compose.yml       # Docker services
├── go.mod                   # Go dependencies
└── run.sh                   # Start script
```

## 🚀 Getting Started

### Prerequisites
- Go 1.21+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 14+ (or use Docker)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd wardrobe
```

2. **Start services with Docker**
```bash
./run.sh
```

This script will:
- Start PostgreSQL container
- Run database migrations
- Start the Go backend server on `http://localhost:8081`
- Start the Next.js frontend on `http://localhost:3000`

### Manual Setup (if not using Docker)

1. **Backend setup**
```bash
# Install dependencies
go mod download

# Run migrations
migrate -path migrations -database "postgresql://user:password@localhost:5432/wardrobe" up

# Start server
go run cmd/server/main.go
```

2. **Frontend setup**
```bash
cd web
npm install
npm run dev
```

## 📚 Data Model

### Clothing Item (Atom)
- `id`: UUID primary key
- `category`: Top, Bottom, Outerwear, Shoes, Accessory
- `sub_category`: Specific type within category
- `color_hex`: Color code (hex format)
- `material`: Material composition
- `image_url`: Path to processed image
- `raw_image_url`: Path to original image
- `image_status`: pending, processing, done
- `last_worn`: Timestamp of last wear

### Outfit (Molecule)
- `id`: UUID primary key
- `name`: Outfit name
- `season`: Spring, Summer, Fall, Winter
- `vibe`: Tags describing the outfit (array)
- `usage_count`: Times worn
- `last_worn`: Timestamp of last wear
- `items`: Associated clothing items (M2M relationship)

### Outfit Log
- `id`: UUID primary key
- `outfit_id`: Reference to outfit worn
- `wear_date`: Date outfit was worn
- `notes`: Optional notes
- `items`: Items worn (historical tracking)

## 🔌 API Endpoints

### Items
- `GET /api/items` - List all items
- `GET /api/items/:id` - Get item details
- `POST /api/items` - Create item
- `PUT /api/items/:id` - Update item
- `DELETE /api/items/:id` - Delete item
- `POST /api/items/:id/image` - Upload image
- `GET /api/items/:id/stats` - Item statistics

### Outfits
- `GET /api/outfits` - List all outfits
- `GET /api/outfits/:id` - Get outfit details
- `POST /api/outfits` - Create outfit
- `PUT /api/outfits/:id` - Update outfit
- `DELETE /api/outfits/:id` - Delete outfit
- `POST /api/outfits/:id/wear` - Mark as worn
- `POST /api/outfits/:id/items` - Add item to outfit
- `DELETE /api/outfits/:id/items/:itemId` - Remove item from outfit

### Outfit Logs
- `GET /api/outfit-logs` - List logs (with date range)
- `POST /api/outfit-logs` - Create/log outfit wear
- `PUT /api/outfit-logs/:id` - Update log
- `DELETE /api/outfit-logs/:id` - Delete log

### Stats
- `GET /api/stats` - Get wardrobe statistics

## 🎨 Features

### Current
- ✅ Item catalog with image upload
- ✅ Outfit creation and management
- ✅ Daily wear logging
- ✅ Outfit wear tracking
- ✅ Item last_worn tracking
- ✅ Statistics dashboard
- ✅ Edit/delete logs
- ✅ Duplicate log prevention (one log per day)
- ✅ Automatic outfit creation from logs (with duplicate prevention)
- ✅ Mobile-first responsive design

### Planned
- [ ] AI-powered outfit suggestions
- [ ] Weather-based outfit recommendations
- [ ] Color coordination analysis
- [ ] Seasonal rotation reminders
- [ ] Export/import wardrobe data
- [ ] Collaborative closet sharing
- [ ] Advanced filtering and search

## 🗄 Database

### Migrations
All schema changes are tracked via migrations in the `migrations/` directory:
- `000001_init.up.sql` - Initial schema
- `000002_image_status.up.sql` - Image processing status
- `000003_outfit_tracking.up.sql` - Outfit usage tracking
- `000004_outfit_logger.up.sql` - Wear logging system
- `000005_optional_outfit_name.up.sql` - Optional outfit names
- `000006_unique_outfit_logs.up.sql` - Unique daily logs

## 🔄 Image Processing

Images go through a processing pipeline:
1. **Upload**: User uploads PNG image to `/api/items/:id/image`
2. **Storage**: Original saved to `uploads/raw/`
3. **Processing**: Goroutine worker removes background
4. **Completion**: Processed image saved to `uploads/clean/`
5. **Status**: Updated in database

## 🧪 Testing

Run tests with:
```bash
go test ./...
```

## 🐛 Troubleshooting

### Backend won't start
- Ensure PostgreSQL is running: `docker ps`
- Check migrations applied: `go run cmd/server/main.go`
- Verify database connection: Check logs for "connected to database"

### Frontend shows JSON parse errors
- Clear Next.js cache: `rm -rf web/.next`
- Restart frontend: `npm run dev`
- Verify backend is running: `curl http://localhost:8081/api/items`

### Images not uploading
- Check `/uploads` directory permissions
- Ensure `uploads/raw` and `uploads/clean` directories exist
- Check image status in database

## 📝 Environment Variables

### Backend
- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:password@db:5432/wardrobe`)
- `PORT`: Server port (default: `8081`)
- `GIN_MODE`: Set to `release` for production

### Frontend
- `NEXT_PUBLIC_API_URL`: Backend API URL (default: `http://localhost:8081`)

## 🛣 Roadmap

- [ ] Mobile app (React Native)
- [ ] Real-time sync
- [ ] Advanced analytics
- [ ] Social features
- [ ] API documentation (Swagger)
- [ ] Performance optimization
- [ ] Cost analysis features

## 📄 License

This project is private and for personal use.

## 👤 Author

Digital wardrobe management system built with ❤️
