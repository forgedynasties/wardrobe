package vision

import (
	"fmt"
	"image"
	"image/png"
	"os"
)

// CropTransparent rewrites the PNG at path with transparent margins trimmed.
// Pixels with alpha below threshold are considered background.
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

	out, err := os.Create(path)
	if err != nil {
		return fmt.Errorf("create: %w", err)
	}
	defer out.Close()
	if err := png.Encode(out, cropped); err != nil {
		return fmt.Errorf("encode: %w", err)
	}
	return nil
}
