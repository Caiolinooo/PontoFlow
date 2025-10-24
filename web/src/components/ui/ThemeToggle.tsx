"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export type ThemeChoice = "light" | "dark" | "system";

export default function ThemeToggle({ align = "right" as "left" | "right" }) {
  const t = useTranslations("theme");
  const [theme, setTheme] = useState<ThemeChoice>("system");

  useEffect(() => {
    // Initialize from DOM class or media query
    try {
      const hasDark = document.documentElement.classList.contains("dark");
      if (hasDark) setTheme("dark");
      else setTheme("light");
    } catch {}
  }, []);

  async function apply(next: ThemeChoice) {
    setTheme(next);
    try {
      await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: next }),
        cache: "no-store",
      });
    } catch {}
    // Apply immediately client-side
    try {
      const root = document.documentElement;
      root.classList.remove("dark");
      if (next === "dark") root.classList.add("dark");
      if (next === "system") {
        const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (prefersDark) root.classList.add("dark");
      }
      localStorage.setItem("theme", next);
      // Cookie is set by the API; still set here as a fallback
      document.cookie = `theme=${next}; path=/; max-age=${60 * 60 * 24 * 365}`;
    } catch {}
  }

  const baseBtn = "px-3 py-1.5 rounded-md text-sm font-medium border border-[var(--input-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors";
  const active = "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent";

  return (
    <div className={`flex gap-2 ${align === "right" ? "justify-end" : "justify-start"}`}>
      <button aria-pressed={theme === "light"} className={`${baseBtn} ${theme === "light" ? active : ""}`} onClick={() => apply("light")}>{t("light")}</button>
      <button aria-pressed={theme === "dark"} className={`${baseBtn} ${theme === "dark" ? active : ""}`} onClick={() => apply("dark")}>{t("dark")}</button>
      <button aria-pressed={theme === "system"} className={`${baseBtn} ${theme === "system" ? active : ""}`} onClick={() => apply("system")}>{t("system")}</button>
    </div>
  );
}

