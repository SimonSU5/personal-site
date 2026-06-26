"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
        alert("作品上传成功！");
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200"
      style={{ paddingLeft: "24px", paddingRight: "24px", paddingTop: "16px", paddingBottom: "16px" }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">上传作品</h1>
          <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
            ← 返回
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto"
      style={{ paddingLeft: "24px", paddingRight: "24px", paddingTop: "32px", paddingBottom: "32px" }}>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 图片上传 */}
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-4">封面图片</h3>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-300 transition-colors">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded" />
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
                    className="cursor-pointer inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    选择图片
                  </label>
                  <p className="text-gray-500 text-sm mt-2">或拖放图片到此处</p>
                </div>
              )}
            </div>
          </div>

          {/* 基本信息 */}
          <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
            <h3 className="font-medium text-gray-900">基本信息</h3>

            <input
              type="text"
              placeholder="作品标题"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
              required
            />

            <textarea
              placeholder="作品描述"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none min-h-[100px]"
              required
            />

            <input
              type="text"
              placeholder="分类（如：数通、软件开发）"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
              required
            />

            <input
              type="url"
              placeholder="演示链接（Demo URL，可选）"
              value={formData.demo}
              onChange={(e) => setFormData({ ...formData, demo: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
            />

            <input
              type="url"
              placeholder="代码仓库（Repository URL，可选）"
              value={formData.repo}
              onChange={(e) => setFormData({ ...formData, repo: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
            />

            <input
              type="text"
              placeholder="技术栈（用逗号分隔，如：React, Node.js, MongoDB）"
              value={formData.tech}
              onChange={(e) => setFormData({ ...formData, tech: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
            />

            <textarea
              placeholder="详细内容（Markdown 格式，可选）"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none min-h-[150px]"
            />
          </div>

          <button
            type="submit"
            disabled={uploading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {uploading ? "上传中..." : "发布作品"}
          </button>
        </form>
      </main>
    </div>
  );
}
