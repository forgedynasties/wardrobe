package domain

import (
	"math/rand"
	"unicode"
)

var outfitAdjectives = []string{
	"breezy", "crimson", "velvet", "midnight", "coastal", "frosted",
	"silk", "wild", "quiet", "bold", "sunlit", "dusty", "electric",
	"lunar", "rustic", "urban", "retro", "vintage", "cozy", "sharp",
	"golden", "muted", "neon", "stormy", "amber", "faded", "glossy",
	"feral", "tender", "loose", "crisp", "smoky", "plush", "raw",
}

var outfitNouns = []string{
	"drift", "ember", "mirage", "echo", "horizon", "muse", "rebel",
	"haze", "dream", "wave", "bloom", "canvas", "mood", "cruise",
	"remix", "edit", "layer", "sketch", "moment", "statement",
	"tempo", "riot", "whim", "relic", "lullaby", "tangent", "orbit",
	"prowl", "kick", "hush", "pulse", "scout", "outline", "static",
}

func RandomOutfitName() string {
	adj := outfitAdjectives[rand.Intn(len(outfitAdjectives))]
	noun := outfitNouns[rand.Intn(len(outfitNouns))]
	return capitalize(adj) + " " + capitalize(noun)
}

func capitalize(s string) string {
	if s == "" {
		return s
	}
	r := []rune(s)
	r[0] = unicode.ToUpper(r[0])
	return string(r)
}
