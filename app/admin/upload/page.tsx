"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, X } from "lucide-react";

export default function UploadPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    demo: "",
    repo: "",
    tech: "",
    content: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = "";
      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          imageUrl = data.url;
        }
      }

      const workData = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        category: formData.category,
        demo: formData.demo,
        repo: formData.repo,
        tech: formData.tech ? formData.tech.split(",").map((t) => t.trim()).filter(Boolean) : [],
        content: formData.content,
        cover: imageUrl,
        featured: false,
        source: "manual",
      };

      const res = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(workData),
      });

      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        alert("上传失败，请重试");
      }
    } catch (err) {
      alert("上传失败，请重试");
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
        <div className="main-content flex flex-col h-[850px] w-full overflow-hidden">
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
                <a onClick={() => router.push("/admin/works")} className="navbar-link active cursor-pointer">
                  作品管理
                </a>
              </li>
              <li className="navbar-item">
                <a onClick={() => router.push("/admin/blog")} className="navbar-link cursor-pointer">
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

          <article className="admin-content active flex flex-col h-full overflow-hidden">
            <header className="article-header article-header-sticky flex-shrink-0 sticky top-0 z-10 bg-bg-card">
              <div className="flex items-center justify-between">
                <h2 className="h2 article-title">发布作品</h2>
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
                {/* 图片上传 */}
                <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "100%" }}>
                  <h3 className="text-text-primary font-medium mb-4">封面图片</h3>
                  <div
                    className="border-2 border-dashed border-border-color rounded-xl p-8 text-center hover:border-accent-primary transition-colors relative"
                    style={{ minHeight: "200px", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Preview" className="max-h-64 rounded-lg" />
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                          id="image-upload"
                        />
                        <label
                          htmlFor="image-upload"
                          className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-accent-primary text-text-inverse rounded-lg hover:opacity-90 transition-opacity"
                        >
                          <Upload size={18} />
                          <span>选择图片</span>
                        </label>
                        <p className="text-text-muted text-sm mt-2">或拖放图片到此处</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 基本信息 */}
                <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "100%", display: "flex", flexDirection: "column", gap: "16px" }}>
                  <h3 className="text-text-primary font-medium">基本信息</h3>

                  <input
                    type="text"
                    placeholder="作品标题"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="admin-input w-full"
                    required
                  />

                  <textarea
                    placeholder="作品描述"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="admin-input w-full min-h-[100px] resize-y"
                    required
                  />

                  <input
                    type="text"
                    placeholder="分类（如：数通、软件开发）"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="admin-input w-full"
                    required
                  />

                  <input
                    type="url"
                    placeholder="演示链接（Demo URL，可选）"
                    value={formData.demo}
                    onChange={(e) => setFormData({ ...formData, demo: e.target.value })}
                    className="admin-input w-full"
                  />

                  <input
                    type="url"
                    placeholder="代码仓库（Repository URL，可选）"
                    value={formData.repo}
                    onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
                    className="admin-input w-full"
                  />

                  <input
                    type="text"
                    placeholder="技术栈（用逗号分隔，如：React, Node.js, MongoDB）"
                    value={formData.tech}
                    onChange={(e) => setFormData({ ...formData, tech: e.target.value })}
                    className="admin-input w-full"
                  />

                  <textarea
                    placeholder="详细内容（Markdown 格式，可选）"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="admin-input w-full min-h-[150px] resize-y font-mono text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={uploading}
                  className="admin-btn admin-btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  {uploading ? "上传中..." : "发布作品"}
                </button>
              </form>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
