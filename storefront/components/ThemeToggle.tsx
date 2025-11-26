"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      aria-label="Promeni temu"
      onClick={toggleTheme}
      className="toggle"
    >
      <span className="toggle__knob">{isDark ? <Moon size={16} /> : <Sun size={16} />}</span>
      <span className="toggle__label">{isDark ? "Noćni" : "Dnevni"}</span>
    </button>
  );
}
