"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/public/Navbar";
import { useStyle } from "@/lib/contexts/StyleContext";

export default function AboutPage() {
  const { style } = useStyle();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch("/api/about");
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (err) {
      console.error("Failed to fetch about data");
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    tech: {
      page: "min-h-screen bg-gray-950 text-gray-100",
      title: "text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-8",
      sectionTitle: "text-2xl font-semibold mb-4 text-cyan-400",
      text: "text-gray-400 leading-relaxed",
      skillTag: "px-3 py-1 text-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded",
      timelineItem: "border-l border-cyan-500/30 pl-6 pb-8",
      timelineDot: "w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(34,211,238,0.5)]",
    },
    warm: {
      page: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800",
      title: "text-4xl font-bold text-gray-900 mb-8 text-center",
      sectionTitle: "text-2xl font-semibold mb-4 text-amber-600",
      text: "text-gray-600 leading-relaxed",
      skillTag: "px-3 py-1 text-sm bg-amber-100 text-amber-700 rounded-full",
      timelineItem: "border-l-2 border-amber-200 pl-6 pb-8",
      timelineDot: "w-4 h-4 bg-amber-400 rounded-full",
    },
  };

  const v = variants[style];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载失败</p>
      </div>
    );
  }

  return (
    <div className={v.page}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className={v.title}>关于我</h1>

        {/* 简介 */}
        <section className="mb-16">
          <p className={`${v.text} text-lg mb-6`}>{data.intro}</p>
          <p className={v.text}>{data.additional}</p>
        </section>

        {/* 技能 */}
        <section className={`mb-16 ${style === "warm" ? "bg-white rounded-3xl shadow-lg p-8" : ""}`}>
          <h2 className={v.sectionTitle}>技术技能</h2>
          <div className="space-y-6">
            {data.skills.map((skillGroup: any) => (
              <div key={skillGroup.category}>
                <h3 className={`font-medium mb-3 ${style === "tech" ? "text-gray-300" : "text-gray-700"}`}>
                  {skillGroup.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillGroup.items.map((skill: string) => (
                    <span key={skill} className={v.skillTag}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 经历 */}
        <section className={`mb-16 ${style === "warm" ? "bg-white rounded-3xl shadow-lg p-8" : ""}`}>
          <h2 className={v.sectionTitle}>工作经历</h2>
          <div className="mt-6">
            {data.timeline.map((item: any, index: number) => (
              <div key={index} className={v.timelineItem}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={v.timelineDot} />
                  <span className={`font-semibold ${style === "tech" ? "text-cyan-400" : ""}`}>
                    {item.year}
                  </span>
                </div>
                <h3 className={`font-medium ${style === "tech" ? "text-gray-200" : "text-gray-800"}`}>
                  {item.title}
                </h3>
                <p className={v.text}>{item.company}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-500">
        © 2024 Simon
      </footer>
    </div>
  );
}
