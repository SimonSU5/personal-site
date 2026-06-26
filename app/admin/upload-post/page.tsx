"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UploadPostPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "",
    readTime: "",
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
        alert("博客文章发布成功！");
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200"
      style={{ paddingLeft: "24px", paddingRight: "24px", paddingTop: "16px", paddingBottom: "16px" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">发布博客文章</h1>
          <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
            ← 返回
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto"
      style={{ paddingLeft: "24px", paddingRight: "24px", paddingTop: "32px", paddingBottom: "32px" }}>
        <form onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div className="bg-white rounded-xl shadow-sm"
          style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
            <h3 className="font-medium text-gray-900">文章信息</h3>

            <input
              type="text"
              placeholder="文章标题"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
              style={{ paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px" }}
              required
            />

            <input
              type="text"
              placeholder="分类（如：React、TypeScript）"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
              style={{ paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px" }}
              required
            />

            <input
              type="text"
              placeholder="阅读时间（如：5 分钟）"
              value={formData.readTime}
              onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
              className="w-full border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
              style={{ paddingLeft: "16px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px" }}
              required
            />

            <textarea
              placeholder="文章摘要"
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none min-h-[80px]"
              required
            />

            <textarea
              placeholder="文章内容（支持 Markdown）"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none min-h-[300px] font-mono text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            style={{ paddingLeft: "24px", paddingRight: "24px", paddingTop: "12px", paddingBottom: "12px" }}
          >
            {uploading ? "发布中..." : "发布文章"}
          </button>
        </form>
      </main>
    </div>
  );
}
