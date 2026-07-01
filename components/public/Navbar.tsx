"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CompactFontSwitcher } from "@/components/ui/ThemeSwitcher";
import { motion } from "framer-motion";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "首页", href: "/" },
    { name: "博客", href: "/blog" },
    { name: "关于", href: "/about" },
    { name: "联系", href: "/contact" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`sticky top-0 z-50 px-6 py-4 border-b border-border-color transition-all duration-300 ${
        scrolled
          ? "bg-bg-primary/90 backdrop-blur-md shadow-lg"
          : "bg-bg-primary/70 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="text-xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          Simon
        </Link>
        <div className="flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="relative px-2 py-1 text-sm font-medium text-text-secondary hover:text-accent-primary transition-colors"
            >
              {item.name}
            </Link>
          ))}
          <CompactFontSwitcher />
        </div>
      </div>
    </motion.nav>
  );
}
