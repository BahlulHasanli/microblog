"use client";

import * as React from "react";

import { Button } from "@/components/tiptap-ui-primitive/button";

import { MoonStarIcon } from "@/components/tiptap-icons/moon-star-icon";
import { SunIcon } from "@/components/tiptap-icons/sun-icon";

const THEME_STORAGE_KEY = "theme";

const isBrowser = typeof window !== "undefined";

function readInitialTheme(): boolean {
  if (!isBrowser) return false;

  try {
    if (document.documentElement.classList.contains("dark")) {
      return true;
    }

    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;

    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = React.useState<boolean>(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setIsDarkMode(readInitialTheme());
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!isBrowser) return;

    const root = document.documentElement;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.attributeName === "class") {
          const hasDark = root.classList.contains("dark");
          setIsDarkMode((prev) => (prev === hasDark ? prev : hasDark));
        }
      }
    });

    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isBrowser) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event: MediaQueryListEvent) => {
      try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "dark" || stored === "light") return;
      } catch {
        return;
      }
      setIsDarkMode(event.matches);
      document.documentElement.classList.toggle("dark", event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const toggleDarkMode = React.useCallback(() => {
    if (!isBrowser) return;

    setIsDarkMode((prev) => {
      const next = !prev;
      try {
        document.documentElement.classList.toggle("dark", next);
        window.localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
      } catch {
        // localStorage erişimi engellenmiş olabilir; sessizce devam et
      }
      return next;
    });
  }, []);

  return (
    <Button
      onClick={toggleDarkMode}
      aria-label={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
      aria-pressed={isDarkMode}
      data-style="ghost"
      type="button"
      suppressHydrationWarning
    >
      {mounted && isDarkMode ? (
        <MoonStarIcon className="tiptap-button-icon" />
      ) : (
        <SunIcon className="tiptap-button-icon" />
      )}
    </Button>
  );
}
