"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/public/Navbar";
import { useStyle } from "@/lib/contexts/StyleContext";
import Link from "next/link";

export default function BlogPage() {
  const { style } = useStyle();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Failed to fetch posts");
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    tech: {
      page: "min-h-screen bg-gray-950 text-gray-100",
      title: "text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-8",
      postCard: "border border-cyan-500/20 bg-gray-900/50 hover:border-cyan-500/40 transition-all p-6",
      postTitle: "text-xl font-semibold text-cyan-400 hover:text-cyan-300",
      postMeta: "text-sm text-gray-500",
      postExcerpt: "text-gray-400 mt-2",
      categoryTag: "px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded",
    },
    warm: {
      page: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800",
      title: "text-4xl font-bold text-gray-900 mb-8 text-center",
      postCard: "bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-6",
      postTitle: "text-xl font-semibold text-gray-800 hover:text-amber-600",
      postMeta: "text-sm text-gray-500",
      postExcerpt: "text-gray-600 mt-2",
      categoryTag: "px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full",
    },
  };

  const v = variants[style];

  return (
    <div className={v.page}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className={v.title}>技术博客</h1>
        <p className={`mb-12 ${style === "warm" ? "text-center text-gray-600" : "text-gray-500"}`}>
          分享技术见解和学习心得
        </p>

        {loading ? (
          <p className="text-gray-500">加载中...</p>
        ) : posts.length === 0 ? (
          <p className="text-gray-500">暂无文章</p>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.id}`}>
                <article className={v.postCard}>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={v.categoryTag}>{post.category}</span>
                    <span className={v.postMeta}>{post.date}</span>
                    <span className={v.postMeta}>· {post.readTime}阅读</span>
                  </div>
                  <h2 className={v.postTitle}>{post.title}</h2>
                  <p className={v.postExcerpt}>{post.excerpt}</p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-500">
        © 2024 Simon
      </footer>
    </div>
  );
}
