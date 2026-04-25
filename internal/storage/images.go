package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/google/uuid"
)

type ImageStoreConfig struct {
	AccountID string
	AccessKey string
	SecretKey string
	Bucket    string
	PublicURL string
}

type ImageStore struct {
	client    *s3.Client
	bucket    string
	publicURL string
}

func NewImageStore(ctx context.Context, cfg ImageStoreConfig) (*ImageStore, error) {
	if cfg.AccountID == "" || cfg.AccessKey == "" || cfg.SecretKey == "" || cfg.Bucket == "" || cfg.PublicURL == "" {
		return nil, fmt.Errorf("missing R2 config: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL must all be set")
	}

	awsCfg, err := config.LoadDefaultConfig(ctx,
		config.WithRegion("auto"),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.AccessKey, cfg.SecretKey, "")),
	)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	endpoint := fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)
	client := s3.NewFromConfig(awsCfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(endpoint)
		o.UsePathStyle = true
	})

	return &ImageStore{
		client:    client,
		bucket:    cfg.Bucket,
		publicURL: strings.TrimRight(cfg.PublicURL, "/"),
	}, nil
}

// SaveRaw streams src to a local tmp file and uploads it to R2 under raw/<id>.png.
// Returns the tmp path so the worker can process it; caller is responsible for removing it.
func (s *ImageStore) SaveRaw(ctx context.Context, id uuid.UUID, src io.Reader) (string, error) {
	tmp, err := os.CreateTemp("", fmt.Sprintf("raw-%s-*.png", id))
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(tmp, src); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return "", err
	}
	if _, err := tmp.Seek(0, 0); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return "", err
	}
	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(s.rawKey(id)),
		Body:        tmp,
		ContentType: aws.String("image/png"),
	})
	tmp.Close()
	if err != nil {
		os.Remove(tmp.Name())
		return "", fmt.Errorf("upload raw: %w", err)
	}
	return tmp.Name(), nil
}

// UploadClean uploads localPath to R2 under clean/<id>.png.
func (s *ImageStore) UploadClean(ctx context.Context, id uuid.UUID, localPath string) error {
	f, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(s.cleanKey(id)),
		Body:        f,
		ContentType: aws.String("image/png"),
	})
	if err != nil {
		return fmt.Errorf("upload clean: %w", err)
	}
	return nil
}

// DownloadClean fetches clean/<id>.png from R2 into a tmp file and returns its path.
// Caller is responsible for removing the tmp.
func (s *ImageStore) DownloadClean(ctx context.Context, id uuid.UUID) (string, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(s.cleanKey(id)),
	})
	if err != nil {
		return "", fmt.Errorf("download clean: %w", err)
	}
	defer out.Body.Close()

	tmp, err := os.CreateTemp("", fmt.Sprintf("clean-%s-*.png", id))
	if err != nil {
		return "", err
	}
	if _, err := io.Copy(tmp, out.Body); err != nil {
		tmp.Close()
		os.Remove(tmp.Name())
		return "", err
	}
	tmp.Close()
	return tmp.Name(), nil
}

// Fetch returns a ReadCloser for the object at the given key. Caller must Close it.
func (s *ImageStore) Fetch(ctx context.Context, key string) (io.ReadCloser, error) {
	out, err := s.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(s.bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, err
	}
	return out.Body, nil
}

func (s *ImageStore) rawKey(id uuid.UUID) string   { return fmt.Sprintf("raw/%s.png", id) }
func (s *ImageStore) cleanKey(id uuid.UUID) string { return fmt.Sprintf("clean/%s.png", id) }
func (s *ImageStore) thumbKey(id uuid.UUID) string { return fmt.Sprintf("thumb/%s.png", id) }

func (s *ImageStore) RawURL(id uuid.UUID) string {
	return fmt.Sprintf("%s/%s", s.publicURL, s.rawKey(id))
}

func (s *ImageStore) CleanURL(id uuid.UUID) string {
	return fmt.Sprintf("%s/%s", s.publicURL, s.cleanKey(id))
}

func (s *ImageStore) ThumbURL(id uuid.UUID) string {
	return fmt.Sprintf("%s/%s", s.publicURL, s.thumbKey(id))
}

// UploadThumb uploads localPath to R2 under thumb/<id>.png.
func (s *ImageStore) UploadThumb(ctx context.Context, id uuid.UUID, localPath string) error {
	f, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(s.bucket),
		Key:         aws.String(s.thumbKey(id)),
		Body:        f,
		ContentType: aws.String("image/png"),
	})
	if err != nil {
		return fmt.Errorf("upload thumb: %w", err)
	}
	return nil
}
