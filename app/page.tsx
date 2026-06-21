"use client";

import { useEffect, useState } from "react";
import works from "@/data/works.json";
import WorkCard from "@/components/ui/WorkCard";
import Navbar from "@/components/public/Navbar";
import { useStyle } from "@/lib/contexts/StyleContext";

export default function Home() {
  const { style } = useStyle();
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        setContent(data);
      }
    } catch (err) {
      console.error("Failed to fetch content");
    }
  };

  const variants = {
    tech: {
      page: "min-h-screen bg-gray-950 text-gray-100",
      hero: "text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4",
      tagline: "text-xl text-gray-400",
      divider: "w-32 h-px bg-gradient-to-r from-cyan-500 to-purple-500",
      sectionTitle: "text-2xl font-semibold mb-8 text-cyan-400",
      aboutBox: "border-t border-gray-800 pt-12",
      aboutText: "text-gray-400",
      contactBox: "border-t border-gray-800 pt-12",
      contactLink: "text-gray-400 hover:text-cyan-400",
      footer: "border-t border-gray-800 text-gray-500",
    },
    warm: {
      page: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800",
      hero: "text-5xl font-bold text-gray-900 mb-4",
      tagline: "text-xl text-gray-600",
      divider: "w-24 h-1 bg-amber-400 rounded-full",
      sectionTitle: "text-2xl font-semibold mb-8 text-amber-600 text-center",
      aboutBox: "bg-white rounded-3xl shadow-lg p-8 md:p-12 mt-12",
      aboutText: "text-gray-600",
      contactBox: "mt-12 pt-12 text-center",
      contactLink: "text-gray-600 hover:text-amber-600",
      footer: "text-gray-500",
    },
  };

  const v = variants[style];

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  const hero = content.hero[style];
  const sections = content.sections;
  const footer = content.footer;

  return (
    <div className={v.page}>
      <Navbar />

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="mb-20">
          {style === "warm" && (
            <div className="text-center mb-4">
              <span className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm">
                👋 {hero.greeting}
              </span>
            </div>
          )}
          <h1 className={`${v.hero} ${style === "warm" ? "text-center" : ""}`}>
            {hero.title}
          </h1>
          <p className={v.tagline}>{hero.tagline}</p>
          <div className={`mt-8 ${v.divider} ${style === "warm" ? "mx-auto" : ""}`} />
        </section>

        {/* Works Grid */}
        <section>
          <h2 className={v.sectionTitle}>{sections.works[style]}</h2>
          {style === "warm" && sections.works.warmSubtitle && (
            <p className="text-center text-gray-500 mb-8">{sections.works.warmSubtitle}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} variant={style} />
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className={v.aboutBox}>
          <h2 className={`${v.sectionTitle} ${style === "warm" ? "" : "mb-4 text-left"}`}>
            {sections.about[style]}
          </h2>
          <p className={`${v.aboutText} leading-relaxed max-w-2xl`}>
            {style === "tech" && "我是一名全栈开发者，热衷于探索前沿技术。专注于构建高性能、可扩展的现代 Web 应用。"}
            {style === "warm" && "我是一名热爱创造的全栈开发者。我相信好的产品不仅要功能强大，更要让用户感到舒适和愉悦。在设计时，我注重用户体验和细节打磨。"}
          </p>

          {style === "tech" && (
            <div className="mt-6 flex flex-wrap gap-2">
              {["React", "Next.js", "TypeScript", "Node.js", "Python", "AWS"].map((tech) => (
                <span key={tech} className="px-3 py-1 text-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded">
                  {tech}
                </span>
              ))}
            </div>
          )}

          {style === "warm" && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {["前端开发", "后端架构", "UI 设计", "产品设计"].map((skill) => (
                <div key={skill} className="text-center p-4 bg-amber-50 rounded-xl">
                  <div className="text-amber-600 font-medium">{skill}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Contact Section */}
        <section className={v.contactBox}>
          <h2 className={`${v.sectionTitle} ${style === "warm" ? "" : "mb-4 text-left"}`}>
            {sections.contact.title}
          </h2>
          {style === "warm" && sections.contact.warmSubtitle && (
            <p className="text-gray-500 mb-6">{sections.contact.warmSubtitle}</p>
          )}
          <div className={`flex gap-6 ${v.contactLink} ${style === "warm" ? "justify-center" : ""}`}>
            <a href="https://github.com">GitHub</a>
            <a href="mailto:hello@example.com">Email</a>
          </div>
          {style === "warm" && (
            <div className="flex justify-center gap-4 mt-6">
              <a href="https://github.com" className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors">
                GitHub
              </a>
              <a href="mailto:hello@example.com" className="px-6 py-3 bg-white text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors">
                发邮件
              </a>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className={`mt-20 py-8 ${v.footer} ${style === "warm" ? "text-center" : ""}`}>
        {footer[style]}
      </footer>
    </div>
  );
}
