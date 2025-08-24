import React from "react";
import { Moon, Sun } from "lucide-react";
import useTheme from "../../hooks/useTheme";
import NeuButton from "./NeuButton";

export default function ThemeToggle({ className = "" }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";
  return (
    <NeuButton
      onClick={toggle}
      className={className}
      aria-label={isDark ? "Trocar para tema claro" : "Trocar para tema escuro"}
      title={isDark ? "Tema claro" : "Tema escuro"}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{isDark ? "Claro" : "Escuro"}</span>
    </NeuButton>
  );
}
