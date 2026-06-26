"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Trash2, Edit, Plus } from "lucide-react";

interface Work {
  id: string;
  title: string;
  description: string;
  cover: string;
  tech: string[];
  demo?: string;
  repo?: string;
  featured?: boolean;
  content: string;
  category?: string;
}

export default function WorksPage() {
  const router = useRouter();
  const [works, setWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    checkAuth();
    fetchWorks();
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

  const fetchWorks = async () => {
    try {
      const res = await fetch("/api/works");
      if (res.ok) {
        const data = await res.json();
        setWorks(data);
      }
    } catch (err) {
      console.error("Failed to fetch works");
    } finally {
      setLoading(false);
    }
  };

  // 提取所有分类
  const categories = ["all", ...new Set(works.map(w => w.category || "未分类").filter(Boolean))];

  // 过滤作品
  const filteredWorks = activeFilter === "all" ? works : works.filter(w => (w.category || "未分类") === activeFilter);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个作品吗？")) return;
    try {
      const res = await fetch(`/api/works/${id}`, { method: "DELETE" });
      if (res.ok) {
        setWorks(works.filter((w) => w.id !== id));
      }
    } catch {
      alert("删除失败");
    }
  };

  const handleToggleFeatured = async (work: Work) => {
    try {
      const res = await fetch(`/api/works/${work.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...work, featured: !work.featured }),
      });
      if (res.ok) {
        setWorks(works.map((w) =>
          w.id === work.id ? { ...w, featured: !w.featured } : w
        ));
      }
    } catch {
      alert("更新失败");
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
                <Link href="/admin/works" className="navbar-link active">
                  作品管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/blog" className="navbar-link">
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
              <h2 className="h2 article-title">作品管理</h2>
            </header>

            <section className="article-content flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
              {/* 分类筛选 */}
              {!loading && works.length > 0 && (
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
              ) : (
                <div className="works-grid">
                  {filteredWorks.map((work) => (
                    <div key={work.id} className="work-card-admin">
                      <div className="work-card-cover">
                        <img src={work.cover || "/placeholder.jpg"} alt={work.title} />
                        <div className="work-card-actions">
                          <button
                            onClick={() => router.push(`/admin/upload?id=${work.id}`)}
                            className="admin-btn admin-btn-secondary"
                            title="编辑"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(work.id)}
                            className="admin-btn admin-btn-danger"
                            title="删除"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {work.featured && (
                          <span className="work-card-badge">精选</span>
                        )}
                      </div>
                      <div className="work-card-info">
                        <h3 className="work-card-title">{work.title}</h3>
                        <p className="work-card-description">{work.description}</p>
                        <div className="work-card-footer">
                          <button
                            onClick={() => handleToggleFeatured(work)}
                            className={`text-sm ${work.featured ? "text-accent-primary" : "text-text-muted"}`}
                          >
                            {work.featured ? "★ 精选" : "☆ 设为精选"}
                          </button>
                          {work.demo && (
                            <a
                              href={work.demo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="work-card-link"
                            >
                              <ExternalLink size={14} />
                            </a>
                          )}
                          {work.repo && (
                            <a
                              href={work.repo}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="work-card-link"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1-.5-4-1.5.5 0 1.5-2.5 0 0 .5 1 1.5 2.5 3 2 5.5 1.5 6 .5.5 0 1 1.5 1.5 3 2 5.5 1.5 6-.5 1-1.5 2-3 2-5.5.08-1.25-.27-2.48-1-3.5 0 0-1-.5-4 1.5-3.5-3.5-6-6-6-6 1.5-1.5 2-2.5 2-3.5V22"/>
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Add Card */}
                  <button
                    onClick={() => router.push("/admin/upload")}
                    className="add-card"
                  >
                    <div className="add-card-icon">
                      <Plus size={32} />
                    </div>
                    <p className="text-text-muted"
                    style={{ marginTop: "16px" }}>添加作品</p>
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
