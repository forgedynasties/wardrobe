package vision

import (
	"fmt"
	"image/png"
	"math"
	"os"
	"sort"
)

const maxColors = 4
const coverageThreshold = 0.85

// ExtractColors returns dominant hex colors from non-transparent pixels in the PNG at path.
// The count is dynamic: colors are added until 85% of pixels are covered, up to 4 max.
func ExtractColors(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, fmt.Errorf("open: %w", err)
	}
	img, err := png.Decode(f)
	f.Close()
	if err != nil {
		return nil, fmt.Errorf("decode: %w", err)
	}

	type entry struct {
		key   uint32
		count int
	}
	counts := map[uint32]*entry{}
	b := img.Bounds()
	totalPixels := 0

	// Sample every 4th pixel for speed on large images.
	step := 4
	for y := b.Min.Y; y < b.Max.Y; y += step {
		for x := b.Min.X; x < b.Max.X; x += step {
			r, g, bl, a := img.At(x, y).RGBA()
			if a < 0x8000 {
				continue
			}
			totalPixels++
			r8 := quantize(uint8(r >> 8))
			g8 := quantize(uint8(g >> 8))
			b8 := quantize(uint8(bl >> 8))
			key := (uint32(r8) << 16) | (uint32(g8) << 8) | uint32(b8)
			if e, ok := counts[key]; ok {
				e.count++
			} else {
				counts[key] = &entry{key: key, count: 1}
			}
		}
	}

	if totalPixels == 0 {
		return nil, nil
	}

	pairs := make([]*entry, 0, len(counts))
	for _, e := range counts {
		pairs = append(pairs, e)
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].count > pairs[j].count })

	// Add distinct colors until coverage threshold reached or max hit.
	chosen := make([]uint32, 0, maxColors)
	covered := 0
	for _, p := range pairs {
		if len(chosen) >= maxColors {
			break
		}
		distinct := true
		for _, c := range chosen {
			if colorDistance(p.key, c) < 40 {
				distinct = false
				break
			}
		}
		if distinct {
			chosen = append(chosen, p.key)
			covered += p.count
			if float64(covered)/float64(totalPixels) >= coverageThreshold {
				break
			}
		}
	}

	hexColors := make([]string, len(chosen))
	for i, c := range chosen {
		r := (c >> 16) & 0xff
		g := (c >> 8) & 0xff
		b := c & 0xff
		hexColors[i] = fmt.Sprintf("#%02x%02x%02x", r, g, b)
	}
	return hexColors, nil
}

// quantize rounds a channel value to the nearest multiple of 16.
func quantize(v uint8) uint8 {
	return (v / 16) * 16
}

// colorDistance returns Euclidean distance in RGB space between two packed RGB uint32 values.
func colorDistance(a, b uint32) float64 {
	ar, ag, ab := float64((a>>16)&0xff), float64((a>>8)&0xff), float64(a&0xff)
	br, bg, bb := float64((b>>16)&0xff), float64((b>>8)&0xff), float64(b&0xff)
	return math.Sqrt((ar-br)*(ar-br) + (ag-bg)*(ag-bg) + (ab-bb)*(ab-bb))
}

