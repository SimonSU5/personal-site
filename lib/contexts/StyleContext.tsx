"use client";

import { createContext, useContext, useEffect, useState } from "react";

type StyleVariant = "tech" | "warm";

interface StyleContextType {
  style: StyleVariant;
  setStyle: (style: StyleVariant) => void;
}

const StyleContext = createContext<StyleContextType | undefined>(undefined);

export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<StyleVariant>("warm");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("site-style") as StyleVariant;
    if (saved && ["tech", "warm"].includes(saved)) {
      setStyleState(saved);
    }
  }, []);

  const setStyle = (newStyle: StyleVariant) => {
    setStyleState(newStyle);
    localStorage.setItem("site-style", newStyle);
  };

  return (
    <StyleContext.Provider value={{ style, setStyle }}>
      {children}
    </StyleContext.Provider>
  );
}

export function useStyle() {
  const context = useContext(StyleContext);
  if (!context) {
    throw new Error("useStyle must be used within a StyleProvider");
  }
  return context;
}
