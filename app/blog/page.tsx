"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/public/Navbar";
import { useTheme } from "@/lib/contexts/ThemeContext";
import Link from "next/link";

export default function BlogPage() {
  const { font } = useTheme();
  const [posts, setPosts] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("all");
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

  // 从博客中提取所有分类
  const categories = ["all", ...new Set(posts.map(p => p.category || "other").filter(Boolean))];

  // 过滤博客
  const filteredPosts = activeFilter === "all"
    ? posts
    : posts.filter(p => (p.category || "other") === activeFilter);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-accent-primary to-accent-secondary bg-clip-text text-transparent mb-8">
          技术博客
        </h1>
        <p className="mb-8 text-text-secondary text-center">
          分享技术见解和学习心得
        </p>

        {/* 分类筛选导航栏 */}
        <div className="mb-8" style={{ borderBottom: "1px solid var(--border-color)" }}>
          <div className="flex gap-6" style={{ paddingBottom: "8px" }}>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveFilter(category)}
                className="transition-colors"
                style={{
                  fontSize: "15px",
                  fontWeight: 500,
                  color: activeFilter === category
                    ? "var(--accent-primary, #D4AF37)"
                    : "var(--text-muted, #999)",
                  borderBottom: activeFilter === category
                    ? "2px solid var(--accent-primary, #D4AF37)"
                    : "none",
                  paddingBottom: "6px",
                  background: "none",
                  cursor: "pointer",
                }}
              >
                {category === "all" ? "全部" : category}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-text-muted">加载中...</p>
        ) : filteredPosts.length === 0 ? (
          <p className="text-text-muted">暂无文章</p>
        ) : (
          <div className="space-y-6">
            {filteredPosts.map((post) => (
              <Link key={post.id} href={`/blog/${post.id}`}>
                <article className="card border border-border-color bg-bg-card hover:border-accent-primary transition-all p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="px-2 py-1 text-xs bg-accent-primary/10 text-accent-primary rounded">
                      {post.category || "技术"}
                    </span>
                    <span className="text-sm text-text-muted">{post.date}</span>
                    <span className="text-sm text-text-muted">· {post.readTime} 阅读</span>
                  </div>
                  <h2 className="text-xl font-semibold text-text-primary hover:text-accent-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-text-secondary mt-2">{post.excerpt}</p>
                </article>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-text-muted">
        © 2024 Simon
      </footer>
    </div>
  );
}
