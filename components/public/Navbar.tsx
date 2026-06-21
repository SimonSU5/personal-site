"use client";

import Link from "next/link";
import { useStyle } from "@/lib/contexts/StyleContext";
import StyleSwitcher from "@/components/ui/StyleSwitcher";

export default function Navbar() {
  const { style } = useStyle();

  const variants = {
    minimal: {
      nav: "border-b border-gray-900 bg-white",
      link: "text-gray-900 hover:text-gray-600",
      active: "text-gray-900 border-b-2 border-gray-900",
      bg: "bg-white",
      text: "text-gray-900",
    },
    tech: {
      nav: "border-b border-cyan-500/30 bg-gray-900/80 backdrop-blur",
      link: "text-gray-300 hover:text-cyan-400",
      active: "text-cyan-400 border-b-2 border-cyan-400",
      bg: "bg-gray-900",
      text: "text-cyan-400",
    },
    warm: {
      nav: "border-b border-amber-100 bg-white/80 backdrop-blur",
      link: "text-gray-600 hover:text-amber-600",
      active: "text-amber-600 border-b-2 border-amber-500",
      bg: "bg-white",
      text: "text-amber-600",
    },
  };

  const navItems = [
    { name: "首页", href: "/" },
    { name: "关于", href: "/about" },
    { name: "博客", href: "/blog" },
    { name: "联系", href: "/contact" },
  ];

  const v = variants[style];

  return (
    <nav className={`sticky top-0 z-50 px-6 py-4 ${v.nav}`}>
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link href="/" className="text-xl font-bold">作品集</Link>
        <div className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`px-2 py-1 ${v.link}`}
            >
              {item.name}
            </Link>
          ))}
          <StyleSwitcher />
        </div>
      </div>
    </nav>
  );
}
