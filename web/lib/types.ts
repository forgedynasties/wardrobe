export interface ClothingItem {
  id: string;
  category: string;
  sub_category: string;
  colors: string[];
  material: string;
  image_url: string;
  raw_image_url: string;
  image_status: string;
  display_scale: number;
  last_worn: string | null;
  created_at: string;
  updated_at: string;
}

export interface OutfitItem extends ClothingItem {
  position_x: number;
  position_y: number;
  scale: number;
  z_index: number;
}

export interface Outfit {
  id: string;
  name: string;
  usage_count: number;
  last_worn: string | null;
  items?: OutfitItem[];
  created_at: string;
  updated_at: string;
}


export interface CreateItemRequest {
  category: string;
  sub_category?: string;
  colors?: string[];
  material?: string;
}

export interface UpdateItemRequest {
  category?: string;
  sub_category?: string;
  colors?: string[];
  material?: string;
  display_scale?: number;
}

export interface CreateOutfitRequest {
  name?: string;
}

export interface UpdateOutfitRequest {
  name?: string;
}

export interface OutfitRecommendation extends Outfit {
  score: number;
  reason: string;
}

export interface OutfitSuggestion {
  items: ClothingItem[];
  reason: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  image_url: string;
  product_url: string;
  price_pkr: number;
  created_at: string;
  updated_at: string;
}

export interface OutfitLog {
  id: string;
  outfit_id: string | null;
  wear_date: string;
  notes: string;
  items?: ClothingItem[];
  created_at: string;
  updated_at: string;
}

export interface LogOutfitWearRequest {
  outfit_id?: string;
  wear_date: string;
  item_ids?: string[];
  notes?: string;
}

export interface CreateWishlistItemRequest {
  name: string;
  image_url?: string;
  product_url: string;
  price_pkr: number;
}

export interface ItemStats {
  outfit_count: number;
  wear_count: number;
  last_worn: string | null;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export interface DayOfWeekCount {
  day: number;
  count: number;
}

export interface TopItem {
  item: ClothingItem;
  wear_count: number;
}

export interface WardrobeStats {
  total_items: number;
  total_outfits: number;
  total_wears: number;
  items_by_category: CategoryCount[];
  never_worn_items: number;
  never_worn_outfits: number;
  avg_wears_per_outfit: number;
  wears_this_month: number;
  wears_by_day_of_week: DayOfWeekCount[];
  top_worn_items: TopItem[];
  colors: string[];
}
