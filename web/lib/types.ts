export interface ClothingItem {
  id: string;
  category: string;
  sub_category: string;
  color_hex: string;
  material: string;
  image_url: string;
  raw_image_url: string;
  image_status: string;
  last_worn: string | null;
  created_at: string;
  updated_at: string;
}

export interface Outfit {
  id: string;
  name: string;
  season: string;
  vibe: string[];
  usage_count: number;
  last_worn: string | null;
  items?: ClothingItem[];
  created_at: string;
  updated_at: string;
}

export interface CreateItemRequest {
  category: string;
  sub_category?: string;
  color_hex?: string;
  material?: string;
}

export interface UpdateItemRequest {
  category?: string;
  sub_category?: string;
  color_hex?: string;
  material?: string;
}

export interface CreateOutfitRequest {
  name: string;
  season?: string;
  vibe?: string[];
}

export interface UpdateOutfitRequest {
  name?: string;
  season?: string;
  vibe?: string[];
}
