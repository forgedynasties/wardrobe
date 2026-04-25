"use client";

import { useEffect, useCallback } from "react";
import { getOutfitLogByDate } from "@/lib/api";
import { useUser } from "@/lib/user-context";

const STORAGE_KEY = "outfit_reminder_enabled";
const CHECKED_KEY = "outfit_reminder_checked_date";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useOutfitReminder() {
  const isEnabled = () => localStorage.getItem(STORAGE_KEY) === "1";

  const enable = useCallback(async () => {
    if (!("Notification" in window)) return "unsupported";
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      localStorage.setItem(STORAGE_KEY, "1");
      return "granted";
    }
    return perm;
  }, []);

  const disable = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { isEnabled, enable, disable };
}

export function OutfitReminder() {
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (localStorage.getItem(STORAGE_KEY) !== "1") return;

    const hour = new Date().getHours();
    if (hour < 18) return; // only fire after 6pm

    const today = todayStr();
    if (localStorage.getItem(CHECKED_KEY) === today) return; // already checked today

    localStorage.setItem(CHECKED_KEY, today);

    getOutfitLogByDate(today)
      .then(() => { /* log exists, no reminder needed */ })
      .catch(() => {
        new Notification("Wardrobe", {
          body: "Don't forget to log what you wore today!",
          icon: "/icon-192.png",
          tag: "outfit-reminder",
        });
      });
  }, [user]);

  return null;
}
