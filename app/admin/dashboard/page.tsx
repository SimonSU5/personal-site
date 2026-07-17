"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, Trash2, Home, LogOut, FileText, Code, User, Mail } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const [works, setWorks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchData();
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

  const fetchData = async () => {
    try {
      const [worksRes, postsRes] = await Promise.all([
        fetch("/api/works"),
        fetch("/api/posts"),
      ]);
      if (worksRes.ok) setWorks(await worksRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (!confirm("确定要删除这个作品吗？")) return;
    try {
      const res = await fetch(`/api/works/${id}`, { method: "DELETE" });
      if (res.ok) setWorks(works.filter((w) => w.id !== id));
    } catch {
      alert("删除失败");
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("确定要删除这篇文章吗？")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) setPosts(posts.filter((p) => p.id !== id));
    } catch {
      alert("删除失败");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        {/* Admin Sidebar - Simplified */}
        <aside className="sidebar">
          <div className="sidebar-info">
            <figure className="avatar-box">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary flex items-center justify-center">
                <User size={40} className="text-accent-primary" />
              </div>
            </figure>
            <div className="info-content">
              <h1 className="name">管理员</h1>
              <p className="title">后台管理</p>
            </div>
          </div>

          <div className="sidebar-info_more">
            <div className="separator" />
            <ul className="social-list">
              <li className="social-item">
                <a href="/" className="social-link" title="返回首页">
                  <Home size={20} />
                </a>
              </li>
              <li className="social-item">
                <button onClick={handleLogout} className="social-link" title="退出登录">
                  <LogOut size={20} />
                </button>
              </li>
            </ul>
          </div>
        </aside>

        {/* Main Content */}
        <div className="main-content admin-main flex flex-col h-[850px] w-full overflow-hidden">
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

          <article className="admin-content active flex flex-col overflow-hidden">
            <header className="article-header article-header-sticky flex-shrink-0 sticky top-0 z-10 bg-bg-card">
              <h2 className="h2 article-title">管理面板</h2>
            </header>

            <section className="article-content flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5"
            style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* Stats */}
              <div className="stats-grid" style={{ marginTop: "24px" }}>
                <div className="stat-card">
                  <div className="stat-icon">
                    <Code size={24} />
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">作品总数</p>
                    <p className="stat-value">{works.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <FileText size={24} />
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">博客文章</p>
                    <p className="stat-value">{posts.length}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">
                    <Code size={24} />
                  </div>
                  <div className="stat-info">
                    <p className="stat-label">GitHub 同步</p>
                    <Link href="/admin/github-settings" className="stat-link text-accent-primary">
                      配置
                    </Link>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="quick-actions">
                <h3 className="text-lg font-semibold"
                style={{ marginBottom: "16px" }}>快捷操作</h3>
                <div className="quick-actions-grid">
                  <Link
                    href="/admin/upload"
                    className="quick-action-card"
                  >
                    <Upload size={32} className="text-accent-primary" />
                    <span className="quick-action-label">上传作品</span>
                  </Link>
                  <Link
                    href="/admin/upload-post"
                    className="quick-action-card"
                  >
                    <FileText size={32} className="text-accent-primary" />
                    <span className="quick-action-label">发布博客</span>
                  </Link>
                  <Link
                    href="/admin/content"
                    className="quick-action-card"
                  >
                    <Edit size={32} className="text-accent-primary" />
                    <span className="quick-action-label">编辑内容</span>
                  </Link>
                  <Link
                    href="/admin/resume"
                    className="quick-action-card"
                  >
                    <User size={32} className="text-accent-primary" />
                    <span className="quick-action-label">简历管理</span>
                  </Link>
                </div>
              </div>

              {/* Recent Works */}
              <div>
                <div className="flex items-center justify-between"
                style={{ marginBottom: "16px" }}>
                  <h3 className="text-lg font-semibold">最近作品</h3>
                  <Link href="/admin/works" className="text-sm text-accent-primary">
                    查看全部
                  </Link>
                </div>
                {loading ? (
                  <p className="text-text-muted">加载中...</p>
                ) : works.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-text-muted">暂无作品</p>
                    <Link href="/admin/upload" className="admin-btn admin-btn-primary"
                    style={{ display: "inline-block", marginTop: "16px" }}>
                      上传第一个作品
                    </Link>
                  </div>
                ) : (
                  <div className="admin-list">
                    {works.slice(0, 5).map((work) => (
                      <div key={work.id} className="admin-list-item">
                        <div className="flex-1">
                          <p className="font-medium">{work.title}</p>
                          <p className="text-sm text-text-secondary">{work.category || "未分类"}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteWork(work.id)}
                          className="admin-btn admin-btn-danger"
                          style={{ paddingLeft: "12px", paddingRight: "12px" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Posts */}
              <div>
                <div className="flex items-center justify-between"
                style={{ marginBottom: "16px" }}>
                  <h3 className="text-lg font-semibold">最近文章</h3>
                  <Link href="/admin/blog" className="text-sm text-accent-primary">
                    查看全部
                  </Link>
                </div>
                {loading ? (
                  <p className="text-text-muted">加载中...</p>
                ) : posts.length === 0 ? (
                  <div className="empty-state">
                    <p className="text-text-muted">暂无文章</p>
                    <Link href="/admin/upload-post" className="admin-btn admin-btn-primary mt-4">
                      发布第一篇文章
                    </Link>
                  </div>
                ) : (
                  <div className="admin-list">
                    {posts.slice(0, 5).map((post) => (
                      <div key={post.id} className="admin-list-item">
                        <div className="flex-1">
                          <p className="font-medium">{post.title}</p>
                          <div className="flex items-center"
                          style={{ gap: "12px", marginTop: "4px" }}>
                            <span className="text-sm text-text-secondary">{post.category}</span>
                            <span className="text-sm text-text-muted">{post.date}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="admin-btn admin-btn-danger"
                          style={{ paddingLeft: "12px", paddingRight: "12px" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}

// Import Upload icon
function Upload({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
    </svg>
  );
}
