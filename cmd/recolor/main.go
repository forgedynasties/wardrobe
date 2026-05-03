// recolor re-extracts and snaps colors for all processed items belonging to a user.
//
// Usage:
//   go run ./cmd/recolor -user <username> [-dry-run]
//
// Requires the same env vars as the server (DATABASE_URL, R2_*).
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"

	"hangur/internal/storage"
	"hangur/internal/vision"

	"database/sql"
	_ "github.com/lib/pq"
)

func main() {
	username := flag.String("user", "", "username to recolor (required)")
	dryRun := flag.Bool("dry-run", false, "print what would change without writing to db")
	flag.Parse()

	if *username == "" {
		fmt.Fprintln(os.Stderr, "usage: recolor -user <username> [-dry-run]")
		os.Exit(1)
	}

	godotenv.Load()

	db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("db open: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("db ping: %v", err)
	}

	store := storage.NewStore(db)
	ctx := context.Background()

	imageStore, err := storage.NewImageStore(ctx, storage.ImageStoreConfig{
		AccountID: os.Getenv("R2_ACCOUNT_ID"),
		AccessKey: os.Getenv("R2_ACCESS_KEY_ID"),
		SecretKey: os.Getenv("R2_SECRET_ACCESS_KEY"),
		Bucket:    os.Getenv("R2_BUCKET"),
		PublicURL: os.Getenv("R2_PUBLIC_URL"),
	})
	if err != nil {
		log.Fatalf("image store: %v", err)
	}

	items, err := store.ListItems(*username, 0, nil)
	if err != nil {
		log.Fatalf("list items: %v", err)
	}

	log.Printf("found %d items for %s", len(items), *username)

	ok, skipped, failed := 0, 0, 0
	for _, item := range items {
		if item.ImageStatus != "done" {
			log.Printf("  skip %s — status=%s", item.ID, item.ImageStatus)
			skipped++
			continue
		}

		tmp, err := imageStore.DownloadClean(ctx, item.ID)
		if err != nil {
			log.Printf("  FAIL %s — download: %v", item.ID, err)
			failed++
			continue
		}

		colors, err := vision.ExtractColors(tmp)
		os.Remove(tmp)
		if err != nil || len(colors) == 0 {
			log.Printf("  FAIL %s — extract: %v", item.ID, err)
			failed++
			continue
		}

		log.Printf("  %s  old=%v  new=%v", item.ID, item.Colors, colors)

		if !*dryRun {
			if err := store.UpdateItemColors(item.ID, colors); err != nil {
				log.Printf("  FAIL %s — update: %v", item.ID, err)
				failed++
				continue
			}
		}
		ok++
	}

	if *dryRun {
		log.Printf("dry run — no writes. would update=%d skip=%d fail=%d", ok, skipped, failed)
	} else {
		log.Printf("done. updated=%d skip=%d fail=%d", ok, skipped, failed)
	}
}
