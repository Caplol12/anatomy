"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import type { UiDictionary } from "../i18n/types";

type Theme = "light" | "dark";

export function ThemeToggle({ t }: { t: UiDictionary }) {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentTheme = document.documentElement.getAttribute("data-theme") as Theme | null;
    if (currentTheme === "dark" || currentTheme === "light") {
      setTheme(currentTheme);
    } else {
      const saved = localStorage.getItem("anatomy_theme") as Theme | null;
      if (saved === "dark" || saved === "light") {
        setTheme(saved);
        document.documentElement.setAttribute("data-theme", saved);
      } else {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const initial = prefersDark ? "dark" : "light";
        setTheme(initial);
        document.documentElement.setAttribute("data-theme", initial);
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
    try {
      localStorage.setItem("anatomy_theme", nextTheme);
    } catch {
      // ignore storage errors
    }
  };

  const isDark = mounted && theme === "dark";
  const label = isDark ? t.theme.light : t.theme.dark;

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${isDark ? "is-dark" : "is-light"}`}
      onClick={toggleTheme}
      aria-label={t.theme.toggle}
      title={label}
    >
      <div className="theme-toggle-icon-wrap" aria-hidden="true">
        <Sun className="theme-icon theme-icon-sun" size={17} />
        <Moon className="theme-icon theme-icon-moon" size={17} />
      </div>
      <span className="sr-only">{label}</span>
    </button>
  );
}
