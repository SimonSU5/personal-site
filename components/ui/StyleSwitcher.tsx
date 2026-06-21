"use client";

import { useStyle } from "@/lib/contexts/StyleContext";

export default function StyleSwitcher() {
  const { style, setStyle } = useStyle();

  const styles = [
    { id: "tech", name: "科技", icon: "◈" },
    { id: "warm", name: "温暖", icon: "◎" },
  ] as const;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm opacity-60">风格:</span>
      <div className="flex gap-1">
        {styles.map((s) => (
          <button
            key={s.id}
            onClick={() => setStyle(s.id)}
            className={`
              px-3 py-1.5 text-sm rounded-lg transition-all
              ${style === s.id
                ? "bg-foreground text-background"
                : "opacity-50 hover:opacity-80"
              }
            `}
            title={s.name}
          >
            {s.icon} {s.name}
          </button>
        ))}
      </div>
    </div>
  );
}
