"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import { useStyle } from "@/lib/contexts/StyleContext";
import Link from "next/link";

export default function WorkDetailPage() {
  const { style } = useStyle();
  const params = useParams();
  const [work, setWork] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchWork(params.id as string);
    }
  }, [params]);

  const fetchWork = async (id: string) => {
    try {
      const res = await fetch("/api/works");
      if (res.ok) {
        const works = await res.json();
        const found = works.find((w: any) => w.id === id);
        setWork(found || null);
      }
    } catch (err) {
      console.error("Failed to fetch work");
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    tech: {
      page: "min-h-screen bg-gray-950 text-gray-100",
      title: "text-4xl font-bold text-cyan-400 mb-4",
      meta: "text-gray-500",
      content: "prose prose-invert prose-cyan max-w-none",
      backLink: "text-gray-400 hover:text-cyan-400",
      linkButton: "inline-block px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors",
      tags: "text-sm text-cyan-300/70",
    },
    warm: {
      page: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800",
      title: "text-4xl font-bold text-gray-900 mb-4",
      meta: "text-gray-500",
      content: "prose prose-amber max-w-none",
      backLink: "text-amber-600 hover:text-amber-700",
      linkButton: "inline-block px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors",
      tags: "text-sm text-amber-600",
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

  if (!work) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">项目不存在</p>
      </div>
    );
  }

  return (
    <div className={v.page}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/" className={`inline-flex items-center gap-2 mb-8 ${v.backLink}`}>
          ← 返回首页
        </Link>

        <article>
          <h1 className={v.title}>{work.title}</h1>

          {work.description && (
            <p className={`text-xl mb-8 ${style === "tech" ? "text-gray-400" : "text-gray-600"}`}>
              {work.description}
            </p>
          )}

          {work.tech && work.tech.length > 0 && (
            <div className={`mb-8 flex flex-wrap gap-2 ${v.tags}`}>
              {work.tech.map((tag: string, index: number) => (
                <span key={`${tag}-${index}`} className="px-3 py-1 bg-gray-100 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-4 mb-8">
            {work.demo && (
              <a
                href={work.demo}
                target="_blank"
                rel="noopener noreferrer"
                className={v.linkButton}
              >
                查看演示
              </a>
            )}
            {work.repo && (
              <a
                href={work.repo}
                target="_blank"
                rel="noopener noreferrer"
                className={`${v.linkButton} ${style === "tech" ? "bg-gray-800 hover:bg-gray-700" : "bg-gray-200 hover:bg-gray-300 text-gray-800"}`}
              >
                查看代码
              </a>
            )}
          </div>

          {work.content && (
            <div className={v.content}>
              <div className="whitespace-pre-wrap">{work.content}</div>
            </div>
          )}
        </article>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-500">
        © 2024 Simon
      </footer>
    </div>
  );
}
