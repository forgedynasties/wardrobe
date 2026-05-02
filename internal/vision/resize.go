package vision

import (
	"fmt"
	"image"
	"image/png"
	"os"
	"path/filepath"

	"golang.org/x/image/draw"
)

// ResizePNG rewrites the PNG at path so neither dimension exceeds maxSide.
// If the image already fits, it is left untouched.
// Writes atomically: original is untouched if any step fails.
func ResizePNG(path string, maxSide int) error {
	f, err := os.Open(path)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	src, err := png.Decode(f)
	f.Close()
	if err != nil {
		return fmt.Errorf("decode: %w", err)
	}

	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w <= maxSide && h <= maxSide {
		return nil
	}

	var dw, dh int
	if w > h {
		dw = maxSide
		dh = (h * maxSide) / w
	} else {
		dh = maxSide
		dw = (w * maxSide) / h
	}
	if dh == 0 {
		dh = 1
	}
	if dw == 0 {
		dw = 1
	}

	dst := image.NewNRGBA(image.Rect(0, 0, dw, dh))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, b, draw.Over, nil)

	tmp, err := os.CreateTemp(filepath.Dir(path), "resize-*.png")
	if err != nil {
		return fmt.Errorf("create tmp: %w", err)
	}
	tmpName := tmp.Name()

	if err := png.Encode(tmp, dst); err != nil {
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

// GenerateThumbnail reads srcPath, writes a resized copy to dstPath (max maxSide px per side).
func GenerateThumbnail(srcPath, dstPath string, maxSide int) error {
	f, err := os.Open(srcPath)
	if err != nil {
		return fmt.Errorf("open: %w", err)
	}
	src, err := png.Decode(f)
	f.Close()
	if err != nil {
		return fmt.Errorf("decode: %w", err)
	}

	b := src.Bounds()
	w, h := b.Dx(), b.Dy()

	var dw, dh int
	if w > h {
		dw = maxSide
		dh = (h * maxSide) / w
	} else {
		dh = maxSide
		dw = (w * maxSide) / h
	}
	if dh == 0 {
		dh = 1
	}
	if dw == 0 {
		dw = 1
	}

	dst := image.NewNRGBA(image.Rect(0, 0, dw, dh))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, b, draw.Over, nil)

	out, err := os.Create(dstPath)
	if err != nil {
		return fmt.Errorf("create: %w", err)
	}
	defer out.Close()
	if err := png.Encode(out, dst); err != nil {
		return fmt.Errorf("encode: %w", err)
	}
	return nil
}
