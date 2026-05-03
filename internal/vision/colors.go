package vision

import (
	"fmt"
	"image/png"
	"math"
	"os"
	"sort"
	"strconv"
)

// ── Extraction ────────────────────────────────────────────────────────────────
const maxColors         = 4    // hard upper bound on colors returned
const coverageThreshold = 0.85 // stop once this fraction of pixels is covered
const colorDistanceMin  = 40.0 // min Euclidean RGB distance between chosen colors

// ── Boost: snap extremes ──────────────────────────────────────────────────────
const snapBlackL    = 15.0 // lightness ≤ this → #000000
const snapWhiteL    = 85.0 // lightness ≥ this → #ffffff
const neutralSatMax = 12.0 // saturation below this → skip hue boost

// ── Boost: chroma ─────────────────────────────────────────────────────────────
const boostSatFactor = 1.6  // multiply existing saturation by this
const boostSatAdd    = 25.0 // then add this (percentage points)

// ── Boost: lightness contrast ─────────────────────────────────────────────────
const boostDarkLFactor  = 0.8  // darks: multiply lightness by this
const boostDarkLMin     = 12.0 // darks: floor after multiplication
const boostLightLFactor = 0.8  // lights: push distance-to-100 by this factor
const boostLightLMax    = 88.0 // lights: ceiling

// ─────────────────────────────────────────────────────────────────────────────

func rgbToHsl(r, g, b float64) (h, s, l float64) {
	max := math.Max(r, math.Max(g, b))
	min := math.Min(r, math.Min(g, b))
	l = (max + min) / 2
	if max == min {
		return 0, 0, l * 100
	}
	d := max - min
	if l > 0.5 {
		s = d / (2 - max - min)
	} else {
		s = d / (max + min)
	}
	switch max {
	case r:
		h = (g - b) / d
		if g < b {
			h += 6
		}
		h /= 6
	case g:
		h = ((b-r)/d + 2) / 6
	default:
		h = ((r-g)/d + 4) / 6
	}
	return h * 360, s * 100, l * 100
}

func hslToHex(h, s, l float64) string {
	h1, s1, l1 := h/360, s/100, l/100
	hue2rgb := func(p, q, t float64) float64 {
		t = math.Mod(t+1, 1)
		if t < 1.0/6 {
			return p + (q-p)*6*t
		}
		if t < 0.5 {
			return q
		}
		if t < 2.0/3 {
			return p + (q-p)*(2.0/3-t)*6
		}
		return p
	}
	var r, g, b float64
	if s1 == 0 {
		r, g, b = l1, l1, l1
	} else {
		var q float64
		if l1 < 0.5 {
			q = l1 * (1 + s1)
		} else {
			q = l1 + s1 - l1*s1
		}
		p := 2*l1 - q
		r = hue2rgb(p, q, h1+1.0/3)
		g = hue2rgb(p, q, h1)
		b = hue2rgb(p, q, h1-1.0/3)
	}
	ri := int(math.Round(r * 255))
	gi := int(math.Round(g * 255))
	bi := int(math.Round(b * 255))
	return fmt.Sprintf("#%02x%02x%02x", ri, gi, bi)
}

func boostColor(hex string) string {
	if len(hex) < 7 {
		return hex
	}
	rv, _ := strconv.ParseUint(hex[1:3], 16, 64)
	gv, _ := strconv.ParseUint(hex[3:5], 16, 64)
	bv, _ := strconv.ParseUint(hex[5:7], 16, 64)
	h, s, l := rgbToHsl(float64(rv)/255, float64(gv)/255, float64(bv)/255)

	if l <= snapBlackL {
		return "#000000"
	}
	if l >= snapWhiteL {
		return "#ffffff"
	}

	newS := s
	if s >= neutralSatMax {
		newS = math.Min(100, s*boostSatFactor+boostSatAdd)
	}

	var newL float64
	if l < 50 {
		newL = math.Max(boostDarkLMin, l*boostDarkLFactor)
	} else {
		newL = math.Min(boostLightLMax, 100-(100-l)*boostLightLFactor)
	}

	return hslToHex(h, newS, newL)
}

// ExtractColors returns dominant hex colors from non-transparent pixels in the PNG at path.
// Count is dynamic: colors are added until coverageThreshold of pixels is covered, up to maxColors.
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

	step := 4 // sample every 4th pixel for speed
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

	chosen := make([]uint32, 0, maxColors)
	covered := 0
	for _, p := range pairs {
		if len(chosen) >= maxColors {
			break
		}
		distinct := true
		for _, c := range chosen {
			if colorDistance(p.key, c) < colorDistanceMin {
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
		hexColors[i] = boostColor(fmt.Sprintf("#%02x%02x%02x", r, g, b))
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
