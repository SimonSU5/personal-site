"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  THEMES,
  DEFAULT_THEME_ID,
  getTheme,
  type ColorMode,
  type Theme,
  type ThemeId,
} from "@/lib/themes";

type FontVariant = "poppins" | "inter" | "space-grotesk";

interface ThemeContextType {
  font: FontVariant;
  setFont: (font: FontVariant) => void;
  /** 当前配色主题 id */
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
  /** 当前主题模式（dark/light），代码块/mermaid 等按此切换 */
  colorMode: ColorMode;
  /** 当前主题完整记录（含色值，mermaid 取强调色用） */
  themeRecord: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_FONT: FontVariant = "poppins";
const VALID_FONTS: FontVariant[] = ["poppins", "inter", "space-grotesk"];
const VALID_THEMES = THEMES.map((t) => t.id);

function isValidTheme(v: string | null): v is ThemeId {
  return !!v && (VALID_THEMES as string[]).includes(v);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontVariant>(DEFAULT_FONT);
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME_ID);
  const [mounted, setMounted] = useState(false);

  // 初始化：从 localStorage 读取保存的字体 + 配色（与 layout.tsx 的防 FOUC 内联脚本同源）
  useEffect(() => {
    setMounted(true);

    const savedFont = localStorage.getItem("font") as FontVariant | null;
    if (savedFont && (VALID_FONTS as string[]).includes(savedFont)) {
      setFontState(savedFont);
      document.documentElement.setAttribute("data-font", savedFont);
    } else {
      document.documentElement.setAttribute("data-font", DEFAULT_FONT);
    }

    const savedTheme = localStorage.getItem("theme");
    const initial = isValidTheme(savedTheme) ? savedTheme : DEFAULT_THEME_ID;
    setThemeState(initial);
    // 防闪脚本已先行设过 data-theme；这里保证与 React state 一致
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  const setFont = (newFont: FontVariant) => {
    setFontState(newFont);
    localStorage.setItem("font", newFont);
    document.documentElement.setAttribute("data-font", newFont);
  };

  const setTheme = (id: ThemeId) => {
    setThemeState(id);
    localStorage.setItem("theme", id);
    document.documentElement.setAttribute("data-theme", id);
  };

  // 派生：当前主题的模式 + 完整记录
  const themeRecord = useMemo(() => getTheme(theme), [theme]);
  const colorMode: ColorMode = themeRecord.mode;

  return (
    <ThemeContext.Provider
      value={{ font, setFont, theme, setTheme, colorMode, themeRecord }}
    >
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
