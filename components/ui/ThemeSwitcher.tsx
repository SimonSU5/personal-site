"use client";

import { motion } from "framer-motion";
import { useTheme } from "@/lib/contexts/ThemeContext";
import { Type } from "lucide-react";
import { useState } from "react";

const fonts = [
  { id: "poppins" as const, name: "Poppins", description: "vCard 原版字体" },
  { id: "inter" as const, name: "Inter", description: "现代简洁" },
  { id: "space-grotesk" as const, name: "Space Grotesk", description: "几何个性" },
];

export function FontSwitcher() {
  const { font, setFont } = useTheme();

  return (
    <div className="fixed top-4 right-4 z-50">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-bg-card rounded-2xl shadow-xl border border-border-color overflow-hidden"
        style={{ width: "280px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-color">
          <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Type className="w-4 h-4 text-accent-primary" />
            字体选择
          </h3>
        </div>

        {/* Font Selection */}
        <div className="p-4">
          <div className="flex flex-col gap-2">
            {fonts.map((f) => {
              const isActive = font === f.id;
              return (
                <motion.button
                  key={f.id}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setFont(f.id)}
                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                    isActive
                      ? "border-accent-primary bg-accent-primary/10"
                      : "border-border-color hover:border-border-color"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Type className={`w-4 h-4 ${isActive ? "text-accent-primary" : "text-text-muted"}`} />
                    <div className="text-left">
                      <p className={`text-sm font-medium ${isActive ? "text-accent-primary" : "text-text-primary"}`}>
                        {f.name}
                      </p>
                      <p className="text-xs text-text-muted">{f.description}</p>
                    </div>
                  </div>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-2 h-2 rounded-full bg-accent-primary"
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// 折叠版本的字体切换器（用于页面嵌入）
export function CompactFontSwitcher() {
  const { font, setFont } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-bg-card border border-border-color text-text-primary text-sm"
      >
        <Type className="w-4 h-4 text-accent-primary" />
        <span>字体</span>
      </motion.button>

      {/* Dropdown */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute top-full mt-2 right-0 bg-bg-card rounded-xl shadow-xl border border-border-color overflow-hidden min-w-[200px]"
        >
          {fonts.map((f) => {
            const isActive = font === f.id;
            return (
              <button
                key={f.id}
                onClick={() => {
                  setFont(f.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive ? "bg-accent-primary/10 text-accent-primary" : "text-text-primary hover:bg-bg-secondary"
                }`}
              >
                <span>{f.name}</span>
                {isActive && (
                  <span className="ml-auto text-xs">{f.description}</span>
                )}
              </button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
