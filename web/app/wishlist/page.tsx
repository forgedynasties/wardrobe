"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  ExternalLink, Heart, Trash2, Plus, Link2, DollarSign, Image, Tag,
  Star, ShoppingBag, ChevronDown, ChevronUp, Wallet,
} from "lucide-react";
import {
  createWishlistItem, deleteWishlistItem, updateWishlistItem,
  getWishlistPage, getExchangeRates,
} from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUser } from "@/lib/user-context";
import type { WishlistItem } from "@/lib/types";

// ── currency ──────────────────────────────────────────────────────────────────

function formatAmount(pkr: number, currency: string, rates: Record<string, number>): string {
  const rate = rates[currency] ?? 1;
  const converted = pkr * rate;
  const sym = CURRENCY_SYMBOLS[currency] ?? currency;
  if (currency === "PKR") return `${sym} ${Math.round(converted).toLocaleString()}`;
  return `${sym}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  PKR: "PKR", USD: "$", EUR: "€", GBP: "£", AED: "AED",
  CAD: "CA$", AUD: "A$", JPY: "¥", CNY: "¥", INR: "₹",
  SAR: "SAR", KWD: "KD", QAR: "QR", TRY: "₺", CHF: "Fr",
  SGD: "S$", MYR: "RM", BDT: "৳", LKR: "LKR",
};

// Popular currencies shown first in the selector
const POPULAR = ["PKR", "USD", "EUR", "GBP", "AED", "CAD", "AUD", "SAR", "INR"];

// ── main ──────────────────────────────────────────────────────────────────────

export default function WishlistPage() {
  const { user, hydrated } = useUser();
  const [items, setItems] = useState<WishlistItem[] | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  // form
  const [name, setName] = useState("");
  const [image, setImage] = useState("");
  const [link, setLink] = useState("");
  const [price, setPrice] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // currency
  const [currency, setCurrency] = useState("PKR");
  const [rates, setRates] = useState<Record<string, number>>({ PKR: 1 });
  const [allCurrencies, setAllCurrencies] = useState<string[]>(POPULAR);

  // budget
  const [budget, setBudget] = useState("");
  const [editingBudget, setEditingBudget] = useState(false);
  const budgetRef = useRef<HTMLInputElement>(null);

  // bought section
  const [showBought, setShowBought] = useState(false);

  // notes editing per card
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesVal, setNotesVal] = useState("");

  useEffect(() => {
    const savedCurrency = localStorage.getItem("wishlist_currency");
    if (savedCurrency) setCurrency(savedCurrency);
    const savedBudget = localStorage.getItem("wishlist_budget");
    if (savedBudget) setBudget(savedBudget);

    getExchangeRates().then((r) => {
      setRates(r);
      const all = [
        ...POPULAR,
        ...Object.keys(r).filter((c) => !POPULAR.includes(c)).sort(),
      ];
      setAllCurrencies(all);
    });
  }, []);

  useEffect(() => {
    if (!hydrated || !user) return;
    getWishlistPage(100)
      .then((page) => { setItems(page.data); setNextCursor(page.next_cursor); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load wishlist"));
  }, [hydrated, user]);

  // auto-load remaining pages
  useEffect(() => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    getWishlistPage(100, nextCursor)
      .then((page) => {
        setItems((prev) => [...(prev ?? []), ...page.data]);
        setNextCursor(page.next_cursor);
      })
      .finally(() => setLoadingMore(false));
  }, [nextCursor]);

  const handleCurrencyChange = (val: string | null) => {
    if (!val) return;
    setCurrency(val);
    localStorage.setItem("wishlist_currency", val);
  };

  const saveBudget = () => {
    localStorage.setItem("wishlist_budget", budget);
    setEditingBudget(false);
  };

  // ── derived ────────────────────────────────────────────────────────────────

  const activeItems = [...(items ?? [])]
    .filter((i) => !i.bought_at)
    .sort((a, b) => b.priority - a.priority || Date.parse(b.created_at) - Date.parse(a.created_at));

  const boughtItems = [...(items ?? [])]
    .filter((i) => !!i.bought_at)
    .sort((a, b) => Date.parse(b.bought_at!) - Date.parse(a.bought_at!));

  const totalPkr = (items ?? []).filter((i) => !i.bought_at).reduce((s, i) => s + i.price_pkr, 0);
  const budgetPkr = budget ? Number(budget) / (rates[currency] ?? 1) : null;
  const overBudget = budgetPkr !== null && totalPkr > budgetPkr;

  // ── actions ────────────────────────────────────────────────────────────────

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAdd = async () => {
    setError(null);
    if (!name.trim() || !link.trim() || !price.trim()) {
      setError("Name, link, and price are required.");
      return;
    }
    setSaving(true);
    try {
      const created = await createWishlistItem({
        name: name.trim(),
        image_url: image.trim(),
        product_url: link.trim(),
        price_pkr: Math.round(Number(price) / (rates[currency] ?? 1)),
      });
      setItems((prev) => [created, ...(prev ?? [])]);
      setName(""); setImage(""); setLink(""); setPrice(""); setFormNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save wishlist item");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      await deleteWishlistItem(id);
      setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    }
  };

  const handleToggleStar = async (item: WishlistItem) => {
    const next = item.priority === 1 ? 0 : 1;
    const updated = await updateWishlistItem(item.id, { priority: next });
    setItems((prev) => prev?.map((i) => i.id === item.id ? updated : i) ?? null);
  };

  const handleToggleBought = async (item: WishlistItem) => {
    const updated = await updateWishlistItem(item.id, { bought: !item.bought_at });
    setItems((prev) => prev?.map((i) => i.id === item.id ? updated : i) ?? null);
  };

  const handleSaveNotes = async (id: string) => {
    const updated = await updateWishlistItem(id, { notes: notesVal });
    setItems((prev) => prev?.map((i) => i.id === id ? updated : i) ?? null);
    setEditingNotes(null);
  };

  // ── item card ──────────────────────────────────────────────────────────────

  function WishlistCard({ item, bought = false }: { item: WishlistItem; bought?: boolean }) {
    return (
      <Card className="overflow-hidden flex flex-col">
        <div className="aspect-square bg-muted/40 flex items-center justify-center overflow-hidden relative">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <Heart className="h-10 w-10 text-muted-foreground" />
          )}
          {!bought && (
            <button
              onClick={() => handleToggleStar(item)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
            >
              <Star
                className={`h-4 w-4 ${item.priority === 1 ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
              />
            </button>
          )}
        </div>
        <div className="p-3 flex-1 space-y-2">
          <div>
            <p className="font-medium text-sm leading-snug">{item.name}</p>
            <p className="text-sm font-semibold mt-0.5">{formatAmount(item.price_pkr, currency, rates)}</p>
          </div>

          {/* notes */}
          {editingNotes === item.id ? (
            <div className="space-y-1.5">
              <Input
                autoFocus
                value={notesVal}
                onChange={(e) => setNotesVal(e.target.value)}
                placeholder="Add a note…"
                className="text-xs h-8"
                onKeyDown={(e) => { if (e.key === "Enter") handleSaveNotes(item.id); if (e.key === "Escape") setEditingNotes(null); }}
              />
              <div className="flex gap-1.5">
                <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleSaveNotes(item.id)}>Save</Button>
                <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditingNotes(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setEditingNotes(item.id); setNotesVal(item.notes); }}
              className="text-xs text-left text-muted-foreground hover:text-foreground transition-colors w-full"
            >
              {item.notes || <span className="italic opacity-50">Add note…</span>}
            </button>
          )}

          <div className="flex flex-wrap gap-1.5 pt-0.5">
            <Button
              type="button" variant="outline" size="sm" className="gap-1 text-xs h-7 px-2"
              onClick={() => window.open(item.product_url, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-3 w-3" /> Open
            </Button>
            {!bought && (
              <Button
                type="button" variant="outline" size="sm" className="gap-1 text-xs h-7 px-2 text-green-600 border-green-600/40 hover:bg-green-50 dark:hover:bg-green-950"
                onClick={() => handleToggleBought(item)}
              >
                <ShoppingBag className="h-3 w-3" /> Bought
              </Button>
            )}
            {bought && (
              <Button
                type="button" variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2 text-muted-foreground"
                onClick={() => handleToggleBought(item)}
              >
                Undo
              </Button>
            )}
            <Button
              type="button" variant="ghost" size="sm" className="gap-1 text-xs h-7 px-2 text-destructive hover:text-destructive"
              onClick={() => handleRemove(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">

      {/* header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <Heart className="h-7 w-7" />Wishlist
          </h1>
          <p className="text-muted-foreground text-sm">Save pieces you want to buy later.</p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* currency row */}
          <div className="flex items-center gap-2">
            <Select value={currency} onValueChange={handleCurrencyChange}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {allCurrencies.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* total + budget */}
          {items !== null && activeItems.length > 0 && (
            <div className="text-right space-y-0.5">
              <p className={`text-xl font-bold ${overBudget ? "text-destructive" : ""}`}>
                {formatAmount(totalPkr, currency, rates)}
              </p>
              <p className="text-xs text-muted-foreground">{activeItems.length} item{activeItems.length !== 1 ? "s" : ""}</p>

              {/* budget cap */}
              {editingBudget ? (
                <div className="flex gap-1 items-center justify-end mt-1">
                  <Input
                    ref={budgetRef}
                    value={budget}
                    onChange={(e) => setBudget(e.target.value.replace(/\D/g, ""))}
                    placeholder={`Budget (${currency})`}
                    className="h-7 text-xs w-32 text-right"
                    onKeyDown={(e) => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditingBudget(false); }}
                    autoFocus
                  />
                  <Button size="sm" className="h-7 text-xs px-2" onClick={saveBudget}>Set</Button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingBudget(true); setTimeout(() => budgetRef.current?.focus(), 50); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                >
                  <Wallet className="h-3 w-3" />
                  {budget ? (
                    <span className={overBudget ? "text-destructive font-medium" : ""}>
                      {overBudget ? "Over " : ""}Budget: {formatAmount(budgetPkr! * (rates[currency] ?? 1) / (rates[currency] ?? 1), currency, rates)}
                    </span>
                  ) : "Set budget"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* add form */}
      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" />Item name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vintage leather jacket" />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5" />Price ({currency})</Label>
            <Input
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
              placeholder="2500"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1.5"><Link2 className="h-3.5 w-3.5" />Product link</Label>
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label className="flex items-center gap-1.5"><Image className="h-3.5 w-3.5" />Item image</Label>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input value={image} onChange={(e) => setImage(e.target.value)} placeholder="Paste image URL or upload below" />
              <Button
                type="button" variant="outline"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file"; input.accept = "image/*";
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleImageUpload(file);
                  };
                  input.click();
                }}
              >Upload image</Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/40 text-destructive px-3 py-2 rounded-lg text-sm">{error}</div>
        )}

        <Button onClick={handleAdd} disabled={saving} className="gap-2">
          <Plus className="h-4 w-4" />
          {saving ? "Saving..." : "Add to Wishlist"}
        </Button>
      </Card>

      {/* list */}
      {items === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden flex flex-col">
              <Skeleton className="aspect-square w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-2/3" /><Skeleton className="h-3 w-1/3" /><Skeleton className="h-8 w-28 mt-2" />
              </div>
            </Card>
          ))}
        </div>
      ) : activeItems.length === 0 && boughtItems.length === 0 ? (
        <Card className="p-8 flex flex-col items-center justify-center text-center">
          <Heart className="h-8 w-8 text-muted-foreground mb-3" />
          <p className="font-medium">No wishlist items yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add dream pieces above and keep the shopping link handy.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeItems.map((item) => <WishlistCard key={item.id} item={item} />)}
          </div>

          {boughtItems.length > 0 && (
            <div>
              <button
                onClick={() => setShowBought((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
              >
                <ShoppingBag className="h-4 w-4" />
                Bought ({boughtItems.length})
                {showBought ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showBought && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 opacity-60">
                  {boughtItems.map((item) => <WishlistCard key={item.id} item={item} bought />)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
