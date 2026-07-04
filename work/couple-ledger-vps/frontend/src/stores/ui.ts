import { defineStore } from "pinia";
import { ACCENT_STORAGE_KEY, SCOPE_STORAGE_KEY, THEME_STORAGE_KEY } from "@/lib/storage";
import type { Scope } from "@/types/api";

type Theme = "light" | "dark";
type Accent = "gold" | "rose" | "sage" | "blue";

const accents: Record<Accent, { main: string; strong: string; glow: string }> = {
  gold: { main: "#c9a962", strong: "#b8923f", glow: "#d4af37" },
  rose: { main: "#cf7e6a", strong: "#b86a58", glow: "#e09480" },
  sage: { main: "#7fa37f", strong: "#6a8f6a", glow: "#95b895" },
  blue: { main: "#6f93b8", strong: "#5a7fa3", glow: "#8aafd0" }
};

export const useUiStore = defineStore("ui", {
  state: () => ({
    theme: (localStorage.getItem(THEME_STORAGE_KEY) || "light") as Theme,
    accent: (localStorage.getItem(ACCENT_STORAGE_KEY) || "gold") as Accent,
    scope: (localStorage.getItem(SCOPE_STORAGE_KEY) || "personal") as Scope
  }),
  actions: {
    applyTheme() {
      const palette = accents[this.accent] || accents.gold;
      const root = document.documentElement;
      root.dataset.theme = this.theme;
      root.style.setProperty("--gold", palette.main);
      root.style.setProperty("--gold-strong", palette.strong);
      root.style.setProperty("--gold-glow", palette.glow);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", this.theme === "dark" ? "#101114" : palette.strong);
    },
    toggleTheme() {
      this.theme = this.theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_STORAGE_KEY, this.theme);
      this.applyTheme();
    },
    setScope(scope: Scope) {
      this.scope = scope;
      localStorage.setItem(SCOPE_STORAGE_KEY, scope);
    },
    setAccent(accent: Accent) {
      this.accent = accent;
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
      this.applyTheme();
    }
  }
});
