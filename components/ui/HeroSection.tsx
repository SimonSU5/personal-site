"use client";

import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

interface HeroSectionProps {
  title: string;
  tagline: string;
  greeting?: string;
}

export default function HeroSection({ title, tagline, greeting }: HeroSectionProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // 检测用户是否偏好减少动画
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // 根据用户偏好决定动画配置
  const chevronTransition = prefersReducedMotion
    ? { duration: 0.5, delay: 0.5 }
    : {
        duration: 0.5,
        delay: 0.5,
        repeat: Infinity,
        repeatType: "reverse" as const,
        repeatDelay: 0.5,
      };

  return (
    <section className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      {greeting && (
        <motion.div
          initial={prefersReducedMotion ? "visible" : { opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.5 }}
          className="mb-6"
        >
          <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            👋 {greeting}
          </span>
        </motion.div>
      )}

      <motion.h1
        initial={prefersReducedMotion ? "visible" : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.1 }}
        className="text-5xl md:text-7xl font-bold text-gray-900 mb-6"
      >
        {title}
      </motion.h1>

      <motion.p
        initial={prefersReducedMotion ? "visible" : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.2 }}
        className="text-xl md:text-2xl text-gray-600 max-w-2xl mb-12"
      >
        {tagline}
      </motion.p>

      <motion.div
        initial={prefersReducedMotion ? "visible" : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.3 }}
        className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full mb-16"
      />

      <motion.div
        initial={prefersReducedMotion ? "visible" : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={chevronTransition}
        className="text-amber-500"
      >
        <ChevronDown size={32} />
      </motion.div>
    </section>
  );
}
