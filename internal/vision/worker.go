package vision

import (
	"context"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sync"

	"wardrobe/internal/domain"
	"wardrobe/internal/storage"

	"github.com/google/uuid"
)

type Worker struct {
	jobs       chan domain.ImageJob
	store      *storage.Store
	imageStore *storage.ImageStore
	wg         sync.WaitGroup
}

func NewWorker(store *storage.Store, imageStore *storage.ImageStore, numWorkers int) *Worker {
	w := &Worker{
		jobs:       make(chan domain.ImageJob, 100),
		store:      store,
		imageStore: imageStore,
	}

	for i := 0; i < numWorkers; i++ {
		w.wg.Add(1)
		go w.run(i)
	}

	return w
}

func (w *Worker) Submit(job domain.ImageJob) {
	w.jobs <- job
}

func (w *Worker) Shutdown() {
	close(w.jobs)
	w.wg.Wait()
}

func (w *Worker) run(id int) {
	defer w.wg.Done()
	for job := range w.jobs {
		log.Printf("[worker %d] processing item %s", id, job.ItemID)
		w.process(job)
	}
}

func (w *Worker) process(job domain.ImageJob) {
	ctx := context.Background()
	defer os.Remove(job.RawPath)

	cleanTmp := filepath.Join(os.TempDir(), "clean-"+job.ItemID.String()+".png")
	defer os.Remove(cleanTmp)

	if _, err := exec.LookPath("rembg"); err == nil {
		cmd := exec.Command("rembg", "i", job.RawPath, cleanTmp)
		output, err := cmd.CombinedOutput()
		if err != nil {
			log.Printf("[worker] rembg failed for %s: %v\n%s", job.ItemID, err, string(output))
			w.store.UpdateImageStatus(job.ItemID, "failed", "", w.imageStore.RawURL(job.ItemID))
			return
		}
	} else {
		// rembg unavailable (e.g. on hosted runtime) — assume raw image is already
		// background-free per project convention and copy it into the clean slot.
		if err := copyFile(job.RawPath, cleanTmp); err != nil {
			log.Printf("[worker] copy raw→clean failed for %s: %v", job.ItemID, err)
			w.store.UpdateImageStatus(job.ItemID, "failed", "", w.imageStore.RawURL(job.ItemID))
			return
		}
	}

	if err := CropTransparent(cleanTmp, 8); err != nil {
		log.Printf("[worker] crop failed for %s: %v", job.ItemID, err)
	}

	if err := w.imageStore.UploadClean(ctx, job.ItemID, cleanTmp); err != nil {
		log.Printf("[worker] upload clean failed for %s: %v", job.ItemID, err)
		w.store.UpdateImageStatus(job.ItemID, "failed", "", w.imageStore.RawURL(job.ItemID))
		return
	}

	if err := w.store.UpdateImageStatus(
		job.ItemID,
		"done",
		w.imageStore.CleanURL(job.ItemID),
		w.imageStore.RawURL(job.ItemID),
	); err != nil {
		log.Printf("[worker] db update failed for %s: %v", job.ItemID, err)
		return
	}

	log.Printf("[worker] done processing %s", job.ItemID)
}

func (w *Worker) SubmitJob(itemID uuid.UUID, rawPath string) {
	w.Submit(domain.ImageJob{
		ItemID:  itemID,
		RawPath: rawPath,
	})
}

func copyFile(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	return err
}
