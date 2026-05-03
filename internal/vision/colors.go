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
const maxColors        = 2    // hard upper bound on colors returned
const coverageThreshold = 0.85 // stop once this fraction of pixels is covered
const colorDistanceMin  = 40.0 // min Euclidean RGB distance between chosen candidates

// ── Named color library ───────────────────────────────────────────────────────
// Extracted colors are snapped to the nearest entry here using CIELAB ΔE.
// Tune by adding / removing / adjusting entries.
type namedColor struct{ name, hex string }

var colorLibrary = []namedColor{
	// Neutrals
	{"Black", "#000000"},
	{"Charcoal", "#333333"},
	{"Dark Gray", "#555555"},
	{"Gray", "#888888"},
	{"Light Gray", "#bbbbbb"},
	{"Off White", "#f0f0ec"},
	{"White", "#ffffff"},

	// Creams & Browns
	{"Cream", "#fffdd0"},
	{"Beige", "#e8dcc8"},
	{"Khaki", "#c8b896"},
	{"Camel", "#c19a6b"},
	{"Tan", "#d2b48c"},
	{"Brown", "#7b4f2e"},
	{"Dark Brown", "#3e1c00"},

	// Blues
	{"Light Blue", "#add8e6"},
	{"Sky Blue", "#87ceeb"},
	{"Cornflower", "#6495ed"},
	{"Blue", "#2255cc"},
	{"Royal Blue", "#4169e1"},
	{"Denim", "#1560bd"},
	{"Dark Blue", "#002266"},
	{"Navy", "#001040"},

	// Teals & Cyans
	{"Turquoise", "#40e0d0"},
	{"Teal", "#008080"},
	{"Dark Teal", "#004c4c"},

	// Greens
	{"Mint", "#98d8a8"},
	{"Sage", "#8fad88"},
	{"Lime", "#32cd32"},
	{"Green", "#008000"},
	{"Forest", "#228b22"},
	{"Olive", "#6b6b00"},
	{"Dark Green", "#013220"},

	// Yellows & Golds
	{"Yellow", "#ffee00"},
	{"Mustard", "#e3a800"},
	{"Gold", "#ffd700"},
	{"Amber", "#ffbf00"},

	// Oranges
	{"Peach", "#ffcba4"},
	{"Orange", "#ff6600"},
	{"Rust", "#b7410e"},
	{"Terracotta", "#c96a3a"},

	// Reds
	{"Coral", "#ff6b6b"},
	{"Red", "#cc0000"},
	{"Crimson", "#dc143c"},
	{"Burgundy", "#800028"},
	{"Maroon", "#5c0a0a"},
	{"Wine", "#722f37"},

	// Pinks
	{"Blush", "#f4c2c2"},
	{"Pink", "#ff80b0"},
	{"Hot Pink", "#ff1493"},
	{"Rose", "#e0006a"},
	{"Deep Pink", "#aa0055"},

	// Purples
	{"Lavender", "#d8c8f0"},
	{"Lilac", "#b89cd0"},
	{"Violet", "#8b00ff"},
	{"Purple", "#7700aa"},
	{"Dark Purple", "#3d0066"},
	{"Indigo", "#3a006f"},
}

// ─────────────────────────────────────────────────────────────────────────────

func srgbToLinear(c float64) float64 {
	if c <= 0.04045 {
		return c / 12.92
	}
	return math.Pow((c+0.055)/1.055, 2.4)
}

func hexToLab(hex string) (L, a, b float64) {
	rv, _ := strconv.ParseUint(hex[1:3], 16, 64)
	gv, _ := strconv.ParseUint(hex[3:5], 16, 64)
	bv, _ := strconv.ParseUint(hex[5:7], 16, 64)
	r := srgbToLinear(float64(rv) / 255)
	g := srgbToLinear(float64(gv) / 255)
	bl := srgbToLinear(float64(bv) / 255)

	x := (r*0.4124564 + g*0.3575761 + bl*0.1804375) / 0.95047
	y := (r*0.2126729 + g*0.7151522 + bl*0.0721750) / 1.00000
	z := (r*0.0193339 + g*0.1191920 + bl*0.9503041) / 1.08883

	f := func(t float64) float64 {
		if t > 0.008856 {
			return math.Cbrt(t)
		}
		return 7.787*t + 16.0/116
	}
	L = 116*f(y) - 16
	a = 500 * (f(x) - f(y))
	b = 200 * (f(y) - f(z))
	return
}

func deltaE(L1, a1, b1, L2, a2, b2 float64) float64 {
	return math.Sqrt((L1-L2)*(L1-L2) + (a1-a2)*(a1-a2) + (b1-b2)*(b1-b2))
}

func snapToLibrary(hex string) string {
	if len(hex) < 7 {
		return hex
	}
	L1, a1, b1 := hexToLab(hex)
	best := hex
	bestDist := math.MaxFloat64
	for _, entry := range colorLibrary {
		L2, a2, b2 := hexToLab(entry.hex)
		if d := deltaE(L1, a1, b1, L2, a2, b2); d < bestDist {
			bestDist = d
			best = entry.hex
		}
	}
	return best
}

// ExtractColors returns dominant hex colors from non-transparent pixels in the PNG at path.
// Count is dynamic: colors are added until coverageThreshold of pixels is covered, up to maxColors.
// Each color is snapped to the nearest named color in colorLibrary using CIELAB ΔE.
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
		hexColors[i] = snapToLibrary(fmt.Sprintf("#%02x%02x%02x", r, g, b))
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
