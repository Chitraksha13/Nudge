"use client";
import { useEffect, useState } from "react";
import { Segmented } from "@/components/ui";

type Theme = "system" | "light" | "dark";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const t = localStorage.getItem("nudge-theme");
      if (t === "light" || t === "dark") setTheme(t);
    } catch {}
  }, []);

  const choose = (t: Theme) => {
    setTheme(t);
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.dataset.theme = t;
    try {
      if (t === "system") localStorage.removeItem("nudge-theme");
      else localStorage.setItem("nudge-theme", t);
    } catch {}
  };

  return (
    <Segmented
      options={[
        { value: "system", label: "System" },
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
      ]}
      value={theme}
      onChange={choose}
    />
  );
}
