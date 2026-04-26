package main

import (
	"context"
	"database/sql"
	"log"
	"os"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	"wardrobe/internal/api"
	"wardrobe/internal/storage"
	"wardrobe/internal/vision"
)

func main() {
	godotenv.Load()

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("failed to connect to db: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to ping db: %v", err)
	}
	log.Println("connected to database")

	// Run migrations
	driver, err := postgres.WithInstance(db, &postgres.Config{})
	if err != nil {
		log.Fatalf("failed to create migration driver: %v", err)
	}
	m, err := migrate.NewWithDatabaseInstance("file://migrations", "postgres", driver)
	if err != nil {
		log.Fatalf("failed to create migrate instance: %v", err)
	}
	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		log.Fatalf("migration failed: %v", err)
	}
	log.Println("migrations applied")

	store := storage.NewStore(db)
	imageStore, err := storage.NewImageStore(context.Background(), storage.ImageStoreConfig{
		AccountID: os.Getenv("R2_ACCOUNT_ID"),
		AccessKey: os.Getenv("R2_ACCESS_KEY_ID"),
		SecretKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		Bucket:    os.Getenv("R2_BUCKET"),
		PublicURL: os.Getenv("R2_PUBLIC_URL"),
	})
	if err != nil {
		log.Fatalf("failed to init image store: %v", err)
	}
	worker := vision.NewWorker(store, imageStore, 3)
	defer worker.Shutdown()
	handler := api.NewHandler(store, imageStore, worker)

	r := gin.Default()
	// CORS configuration with proper origin handling
	allowedOrigins := []string{
		"https://wardrobe.cd4li.space",
		"http://localhost:3000",
		"http://localhost:3001",
	}
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			for _, allowed := range allowedOrigins {
				if origin == allowed {
					return true
				}
			}
			return false
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization", "X-User"},
		AllowCredentials: true,
	}))
	api.RegisterRoutes(r, handler)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("server starting on :%s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
