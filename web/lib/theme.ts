export const THEME_IDS = ["", "theme-sage", "theme-mauve", "theme-ocean", "theme-clay", "theme-noir", "theme-alishba"] as const;
export type ThemeId = typeof THEME_IDS[number];

const STORAGE_KEY = (username: string) => `theme:${username}`;

export function applyTheme(id: ThemeId) {
  const root = document.documentElement;
  THEME_IDS.forEach(t => { if (t) root.classList.remove(t); });
  if (id) root.classList.add(id);
}

export function saveTheme(username: string, id: ThemeId) {
  localStorage.setItem(STORAGE_KEY(username), id);
}

export function loadTheme(username: string): ThemeId {
  const saved = localStorage.getItem(STORAGE_KEY(username)) ?? "";
  return (THEME_IDS as readonly string[]).includes(saved) ? saved as ThemeId : "";
}
