"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import { useStyle } from "@/lib/contexts/StyleContext";
import Link from "next/link";

export default function BlogDetailPage() {
  const { style } = useStyle();
  const params = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPost(params.id as string);
    }
  }, [params]);

  const fetchPost = async (id: string) => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const posts = await res.json();
        const found = posts.find((p: any) => p.id === id);
        setPost(found || null);
      }
    } catch (err) {
      console.error("Failed to fetch post");
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
    },
    warm: {
      page: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800",
      title: "text-4xl font-bold text-gray-900 mb-4",
      meta: "text-gray-500",
      content: "prose prose-amber max-w-none",
      backLink: "text-amber-600 hover:text-amber-700",
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

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">文章不存在</p>
      </div>
    );
  }

  return (
    <div className={v.page}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <Link href="/blog" className={`inline-flex items-center gap-2 mb-8 ${v.backLink}`}>
          ← 返回博客列表
        </Link>

        <article>
          <h1 className={v.title}>{post.title}</h1>

          <div className={`flex items-center gap-4 mb-8 ${v.meta}`}>
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.category}</span>
            <span>·</span>
            <span>{post.readTime}阅读</span>
          </div>

          <div className={v.content}>
            <p>{post.excerpt}</p>
            <div className="whitespace-pre-wrap mt-6">{post.content}</div>
          </div>
        </article>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-500">
        © 2024 Simon
      </footer>
    </div>
  );
}
