"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { THEMES, DEFAULT_THEME_ID } from "@/lib/themes";

/**
 * 配色色块：直接常驻在侧栏 Home 图标下方，无弹窗。点击即切主题。
 * 颜色全走内联 var()（不依赖易失效的 Tailwind 色类）；激活圆点用 boxShadow 双环。
 */
export function ColorThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? DEFAULT_THEME_ID;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "4px 7px 0",
      }}
    >
      {THEMES.map((t) => {
        const active = t.id === current;
        return (
          <motion.button
            key={t.id}
            type="button"
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.88 }}
            onClick={() => setTheme(t.id)}
            title={t.name}
            aria-label={t.name}
            aria-pressed={active}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              padding: 0,
              border: "none",
              cursor: "pointer",
              background: t.swatch,
              boxShadow: active
                ? "0 0 0 2px var(--bg-card), 0 0 0 4px var(--accent-primary)"
                : "0 0 0 1px var(--border-color)",
            }}
          />
        );
      })}
    </div>
  );
}
