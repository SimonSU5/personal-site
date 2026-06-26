"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, Edit, Plus, Clock } from "lucide-react";

interface Post {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  cover: string;
}

export default function BlogPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    checkAuth();
    fetchPosts();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/check");
      if (!res.ok) {
        router.push("/admin/login");
      }
    } catch {
      router.push("/admin/login");
    }
  };

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

  // 提取所有分类
  const categories = ["all", ...new Set(posts.map(p => p.category || "未分类").filter(Boolean))];

  // 过滤文章
  const filteredPosts = activeFilter === "all" ? posts : posts.filter(p => (p.category || "未分类") === activeFilter);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这篇文章吗？")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts(posts.filter((p) => p.id !== id));
      }
    } catch {
      alert("删除失败");
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        {/* Admin Sidebar - Simplified */}
        <aside className="sidebar">
          <div className="sidebar-info">
            <figure className="avatar-box">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary flex items-center justify-center">
                <span className="text-2xl text-accent-primary">👨‍💻</span>
              </div>
            </figure>
            <div className="info-content">
              <h1 className="name">管理员</h1>
              <p className="title">后台管理</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="main-content flex flex-col h-[850px] w-full overflow-hidden">
          <nav className="navbar sticky top-0 z-20 bg-bg-card">
            <ul className="navbar-list">
              <li className="navbar-item">
                <Link href="/admin/content" className="navbar-link">
                  内容编辑
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/resume" className="navbar-link">
                  简历管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/works" className="navbar-link">
                  作品管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/blog" className="navbar-link active">
                  博客管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/contact" className="navbar-link">
                  联系管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/github-settings" className="navbar-link">
                  GitHub 同步
                </Link>
              </li>
            </ul>
          </nav>

          <article className="admin-content active flex flex-col h-full overflow-hidden">
            <header className="article-header article-header-sticky flex-shrink-0 sticky top-0 z-10 bg-bg-card">
              <h2 className="h2 article-title">博客管理</h2>
            </header>

            <section className="article-content flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
              {/* 分类筛选 */}
              {!loading && posts.length > 0 && (
                <div className="filter-list" style={{ marginTop: "24px", marginBottom: "24px" }}>
                  {categories.map((category) => (
                    <button
                      key={category}
                      className={`admin-tab ${activeFilter === category ? "active" : ""}`}
                      onClick={() => setActiveFilter(category)}
                      style={{
                        padding: "8px 16px",
                        background: activeFilter === category ? "var(--accent-primary)" : "var(--bg-card)",
                        color: activeFilter === category ? "var(--onyx)" : "var(--text-primary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {category === "all" ? "全部" : category}
                    </button>
                  ))}
                </div>
              )}
              {loading ? (
                <p className="text-text-muted">加载中...</p>
              ) : posts.length === 0 ? (
                <button
                  onClick={() => router.push("/admin/upload-post")}
                  className="add-card"
                >
                  <div className="add-card-icon">
                    <Plus size={32} />
                  </div>
                  <p className="text-text-muted"
                  style={{ marginTop: "16px" }}>发布第一篇文章</p>
                </button>
              ) : (
                <div className="posts-grid">
                  {filteredPosts.map((post) => (
                    <div key={post.id} className="post-card-admin">
                      <div className="post-card-cover">
                        <img src={post.cover || "/placeholder.jpg"} alt={post.title} />
                        <div className="post-card-actions">
                          <button
                            onClick={() => router.push(`/admin/upload-post?id=${post.id}`)}
                            className="admin-btn admin-btn-secondary"
                            title="编辑"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="admin-btn admin-btn-danger"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <span className="post-card-category">{post.category}</span>
                      </div>
                      <div className="post-card-info">
                        <h3 className="post-card-title">{post.title}</h3>
                        <p className="post-card-excerpt">{post.excerpt}</p>
                        <div className="post-card-meta">
                          <span className="flex items-center text-text-muted text-sm"
                          style={{ gap: "4px" }}>
                            <Clock size={12} />
                            {post.date}
                          </span>
                          <span className="text-text-muted text-sm">{post.readTime}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Card */}
                  <button
                    onClick={() => router.push("/admin/upload-post")}
                    className="add-card"
                  >
                    <div className="add-card-icon">
                      <Plus size={32} />
                    </div>
                    <p className="text-text-muted mt-4">发布文章</p>
                  </button>
                </div>
              )}
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
