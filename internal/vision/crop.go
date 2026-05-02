package vision

import (
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"
)

// CropTransparent rewrites the PNG at path with transparent margins trimmed.
// Pixels with alpha below threshold are considered background.
// Writes atomically: original is untouched if any step fails.
func CropTransparent(path string, alphaThreshold uint8) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	src, err := png.Decode(f)
	f.Close()
	if err != nil {
		return fmt.Errorf("decode: %w", err)
	}

	bounds := src.Bounds()
	minX, minY := bounds.Max.X, bounds.Max.Y
	maxX, maxY := bounds.Min.X, bounds.Min.Y
	found := false

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			_, _, _, a := src.At(x, y).RGBA()
			if uint8(a>>8) > alphaThreshold {
				if x < minX {
					minX = x
				}
				if y < minY {
					minY = y
				}
				if x > maxX {
					maxX = x
				}
				if y > maxY {
					maxY = y
				}
				found = true
			}
		}
	}

	if !found {
		return nil
	}

	cropRect := image.Rect(minX, minY, maxX+1, maxY+1)
	type subImager interface {
		SubImage(r image.Rectangle) image.Image
	}
	si, ok := src.(subImager)
	if !ok {
		return fmt.Errorf("image type %T does not support SubImage", src)
	}
	cropped := si.SubImage(cropRect)

	tmp, err := os.CreateTemp(filepath.Dir(path), "crop-*.png")
	if err != nil {
		return fmt.Errorf("create tmp: %w", err)
	}
	tmpName := tmp.Name()

	if err := png.Encode(tmp, cropped); err != nil {
		tmp.Close()
		os.Remove(tmpName)
		return fmt.Errorf("encode: %w", err)
	}
	if err := tmp.Close(); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("close tmp: %w", err)
	}
	if err := os.Rename(tmpName, path); err != nil {
		os.Remove(tmpName)
		return fmt.Errorf("rename: %w", err)
	}
	return nil
}
