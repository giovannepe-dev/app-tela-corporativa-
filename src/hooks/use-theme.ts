import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Theme = "dark" | "light" | "system";

function getSystemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme: Theme) {
  const resolved = theme === "system" ? getSystemTheme() : theme;
  document.documentElement.classList.toggle("dark", resolved === "dark");
}

export function useTheme() {
  const { profile } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("app-theme") as Theme | null;
    return stored || "dark";
  });

  // Load from company settings
  useEffect(() => {
    if (!profile?.company_id) return;
    supabase
      .from("companies")
      .select("settings")
      .eq("id", profile.company_id)
      .single()
      .then(({ data }) => {
        const s = (data?.settings as Record<string, any>) || {};
        if (s.theme) {
          setThemeState(s.theme as Theme);
          localStorage.setItem("app-theme", s.theme);
        }
      });
  }, [profile?.company_id]);

  // Apply theme
  useEffect(() => {
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem("app-theme", t);
    applyTheme(t);
  };

  return { theme, setTheme };
}
