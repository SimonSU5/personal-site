"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

export default function UploadPostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "",
    readTime: "",
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    checkAuth();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const date = new Date().toISOString().split("T")[0];
      const postData = {
        ...formData,
        date,
      };

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        alert("发布失败，请重试");
      }
    } catch (err) {
      alert("发布失败，请重试");
    } finally {
      setUploading(false);
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
        <div className="main-content admin-main flex flex-col h-[850px] w-full overflow-hidden">
          <nav className="navbar sticky top-0 z-20 bg-bg-card">
            <ul className="navbar-list">
              <li className="navbar-item">
                <a onClick={() => router.push("/admin/content")} className="navbar-link cursor-pointer">
                  内容编辑
                </a>
              </li>
              <li className="navbar-item">
                <a onClick={() => router.push("/admin/resume")} className="navbar-link cursor-pointer">
                  简历管理
                </a>
              </li>
              <li className="navbar-item">
                <a onClick={() => router.push("/admin/works")} className="navbar-link cursor-pointer">
                  作品管理
                </a>
              </li>
              <li className="navbar-item">
                <a onClick={() => router.push("/admin/blog")} className="navbar-link active cursor-pointer">
                  博客管理
                </a>
              </li>
              <li className="navbar-item">
                <a onClick={() => router.push("/admin/contact")} className="navbar-link cursor-pointer">
                  联系管理
                </a>
              </li>
              <li className="navbar-item">
                <a onClick={() => router.push("/admin/github-settings")} className="navbar-link cursor-pointer">
                  GitHub 同步
                </a>
              </li>
            </ul>
          </nav>

          <article className="admin-content active flex flex-col overflow-hidden">
            <header className="article-header article-header-sticky flex-shrink-0 sticky top-0 z-10 bg-bg-card">
              <div className="flex items-center justify-between">
                <h2 className="h2 article-title">发布文章</h2>
                <button
                  type="button"
                  onClick={() => router.push("/admin/dashboard")}
                  className="admin-btn admin-btn-secondary flex items-center"
                  style={{ gap: "8px" }}
                >
                  <ArrowLeft size={16} />
                  返回
                </button>
              </div>
            </header>

            <section className="article-content flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 className="text-text-primary font-medium flex items-center gap-2">
                    <FileText size={18} className="text-accent-primary" />
                    <span>文章信息</span>
                  </h3>

                  <input
                    type="text"
                    placeholder="文章标题"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="admin-input w-full"
                    required
                  />

                  <input
                    type="text"
                    placeholder="分类（如：React、TypeScript）"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="admin-input w-full"
                    required
                  />

                  <input
                    type="text"
                    placeholder="阅读时间（如：5 分钟）"
                    value={formData.readTime}
                    onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                    className="admin-input w-full"
                    required
                  />

                  <textarea
                    placeholder="文章摘要"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="admin-input w-full min-h-[80px] resize-y"
                    required
                  />

                  <textarea
                    placeholder="文章内容（支持 Markdown）"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="admin-input w-full min-h-[300px] resize-y font-mono text-sm"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="admin-btn admin-btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {uploading ? "发布中..." : "发布文章"}
                </button>
              </form>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
