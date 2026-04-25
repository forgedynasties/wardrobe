"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Heart, ExternalLink, Star } from "lucide-react";
import { getPublicWishlist, getExchangeRates } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { WishlistItem } from "@/lib/types";

const POPULAR = ["PKR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SAR", "INR"];
const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "PKR", USD: "$", EUR: "€", GBP: "£", AED: "AED",
  CAD: "CA$", AUD: "A$", JPY: "¥", CNY: "¥", INR: "₹",
  SAR: "SAR", KWD: "KD", QAR: "QR", TRY: "₺", CHF: "Fr",
  SGD: "S$", MYR: "RM", BDT: "৳", LKR: "LKR",
};

function formatAmount(pkr: number, currency: string, rates: Record<string, number>) {
  const rate = rates[currency] ?? 1;
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  const converted = pkr * rate;
  if (currency === "PKR") return `${sym} ${Math.round(converted).toLocaleString()}`;
  return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function PublicWishlistPage() {
  const { token } = useParams<{ token: string }>();
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currency, setCurrency] = useState("PKR");
  const [rates, setRates] = useState<Record<string, number>>({ PKR: 1 });
  const [allCurrencies, setAllCurrencies] = useState<string[]>(POPULAR);

  useEffect(() => {
    getExchangeRates().then((r) => {
      setRates(r);
      setAllCurrencies([...POPULAR, ...Object.keys(r).filter((c) => !POPULAR.includes(c)).sort()]);
    });
    getPublicWishlist(token)
      .then(setItems)
      .catch(() => setError("Wishlist not found or link is invalid."));
  }, [token]);

  const starred = (items ?? []).filter((i) => i.priority === 1);
  const rest = (items ?? []).filter((i) => i.priority !== 1);

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Heart className="h-7 w-7" />Wishlist
          </h1>
          <p className="text-sm text-muted-foreground">Someone shared their wishlist with you.</p>
        </div>
        <Select value={currency} onValueChange={(v) => v && setCurrency(v)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {allCurrencies.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Card className="p-8 text-center text-muted-foreground">
          <p>{error}</p>
        </Card>
      )}

      {items === null && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-3 space-y-2">
                <Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {items !== null && items.length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">
          <Heart className="h-8 w-8 mx-auto mb-3" />
          <p>Nothing on this wishlist yet.</p>
        </Card>
      )}

      {[...starred, ...rest].length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...starred, ...rest].map((item) => (
            <Card key={item.id} className="overflow-hidden flex flex-col">
              <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <Heart className="h-10 w-10 text-muted-foreground" />
                )}
                {item.priority === 1 && (
                  <div className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </div>
                )}
              </div>
              <div className="p-3 flex-1 space-y-2">
                <div>
                  <p className="font-medium text-sm">{item.name}</p>
                  <p className="text-sm font-semibold mt-0.5">{formatAmount(item.price_pkr, currency, rates)}</p>
                </div>
                {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                <Button
                  variant="outline" size="sm" className="gap-1.5 text-xs h-7"
                  onClick={() => window.open(item.product_url, "_blank", "noopener,noreferrer")}
                >
                  <ExternalLink className="h-3 w-3" /> Open link
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
