export const OUTFIT_NAME_PREFIXES = [
  "Islamabadi", "Lahori", "Karachi", "Peshawari", "Quetta", "Multani", 
  "Sialkoti", "Faisalabadi", "Bahawalpuri", "Gujranwala", "Hyderabadi", 
  "Pindi", "Skardu", "Hunza", "Gilgiti", "Swati", "Kashmiri", "Chitrali",
  "Sargodha", "Sukkur", "Mardani", "Ziarati", "Makrani", "Potohari"
];

export const OUTFIT_NAME_SUFFIXES = [
  "Biryani", "Karahi", "Nihari", "Haleem", "Kulfi", "Falooda", "Jalebi", 
  "Chai", "Paratha", "Kabab", "Tikka", "Samosa", "Lassi", "Sajji", 
  "Halwa", "Puri", "Gol Gappa", "Paan", "Paye", "Chapli", "Handi",
  "Pulao", "Korma", "Barfi"
];

export function randomOutfitName(): string {
  const prefix = OUTFIT_NAME_PREFIXES[Math.floor(Math.random() * OUTFIT_NAME_PREFIXES.length)];
  const suffix = OUTFIT_NAME_SUFFIXES[Math.floor(Math.random() * OUTFIT_NAME_SUFFIXES.length)];
  return `${prefix} ${suffix}`;
}

export function outfitNameSuggestions(n = 6): string[] {
  const seen = new Set<string>();
  const results: string[] = [];
  let attempts = 0;
  while (results.length < n && attempts < 100) {
    const name = randomOutfitName();
    if (!seen.has(name)) { seen.add(name); results.push(name); }
    attempts++;
  }
  return results;
}
