"use client";

import { createContext, useContext, useEffect, useState } from "react";

type FontVariant = "poppins" | "inter" | "space-grotesk";

interface ThemeContextType {
  font: FontVariant;
  setFont: (font: FontVariant) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_FONT: FontVariant = "poppins";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontVariant>(DEFAULT_FONT);
  const [mounted, setMounted] = useState(false);

  // 初始化：从 localStorage 读取保存的设置
  useEffect(() => {
    setMounted(true);
    const savedFont = localStorage.getItem("font") as FontVariant;

    if (savedFont && ["poppins", "inter", "space-grotesk"].includes(savedFont)) {
      setFontState(savedFont);
      document.documentElement.setAttribute("data-font", savedFont);
    } else {
      document.documentElement.setAttribute("data-font", DEFAULT_FONT);
    }
  }, []);

  const setFont = (newFont: FontVariant) => {
    setFontState(newFont);
    localStorage.setItem("font", newFont);
    document.documentElement.setAttribute("data-font", newFont);
  };

  return (
    <ThemeContext.Provider value={{ font, setFont }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
