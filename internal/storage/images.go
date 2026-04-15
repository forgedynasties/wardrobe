package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"

	"github.com/google/uuid"
)

type ImageStore struct {
	basePath string
}

func NewImageStore(basePath string) *ImageStore {
	os.MkdirAll(filepath.Join(basePath, "raw"), 0755)
	os.MkdirAll(filepath.Join(basePath, "clean"), 0755)
	return &ImageStore{basePath: basePath}
}

func (s *ImageStore) SaveRaw(id uuid.UUID, src io.Reader) (string, error) {
	filename := fmt.Sprintf("%s.png", id.String())
	path := filepath.Join(s.basePath, "raw", filename)

	f, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	if _, err := io.Copy(f, src); err != nil {
		return "", err
	}
	return path, nil
}

func (s *ImageStore) RawPath(id uuid.UUID) string {
	return filepath.Join(s.basePath, "raw", fmt.Sprintf("%s.png", id.String()))
}

func (s *ImageStore) CleanPath(id uuid.UUID) string {
	return filepath.Join(s.basePath, "clean", fmt.Sprintf("%s.png", id.String()))
}

func (s *ImageStore) RawURL(id uuid.UUID) string {
	return fmt.Sprintf("/uploads/raw/%s.png", id.String())
}

func (s *ImageStore) CleanURL(id uuid.UUID) string {
	return fmt.Sprintf("/uploads/clean/%s.png", id.String())
}
