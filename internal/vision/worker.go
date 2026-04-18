package vision

import (
	"log"
	"os/exec"
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
	cleanPath := w.imageStore.CleanPath(job.ItemID)

	cmd := exec.Command("rembg", "i", job.RawPath, cleanPath)
	output, err := cmd.CombinedOutput()
	if err != nil {
		log.Printf("[worker] rembg failed for %s: %v\n%s", job.ItemID, err, string(output))
		w.store.UpdateImageStatus(job.ItemID, "failed", "", w.imageStore.RawURL(job.ItemID))
		return
	}

	if err := CropTransparent(cleanPath, 8); err != nil {
		log.Printf("[worker] crop failed for %s: %v", job.ItemID, err)
	}

	err = w.store.UpdateImageStatus(
		job.ItemID,
		"done",
		w.imageStore.CleanURL(job.ItemID),
		w.imageStore.RawURL(job.ItemID),
	)
	if err != nil {
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
