"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface ContentData {
  siteName: string;
  hero: {
    warm: { greeting: string; title: string; tagline: string };
    tech: { title: string; tagline: string };
  };
  sections: {
    works: { warm: string; tech: string; warmSubtitle: string };
    about: { warm: string; tech: string };
    contact: { title: string; warmSubtitle: string };
  };
  footer: {
    warm: string;
    tech: string;
  };
  socialLinks: {
    github: string;
    email: string;
    weixin: string;
  };
}

export default function EditContentPage() {
  const router = useRouter();
  const [data, setData] = useState<ContentData>({
    siteName: "",
    hero: { warm: { greeting: "", title: "", tagline: "" }, tech: { title: "", tagline: "" } },
    sections: { works: { warm: "", tech: "", warmSubtitle: "" }, about: { warm: "", tech: "" }, contact: { title: "", warmSubtitle: "" } },
    footer: { warm: "", tech: "" },
    socialLinks: { github: "", email: "", weixin: "" },
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"hero" | "sections" | "footer" | "social">("hero");

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
      const res = await fetch("/api/content");
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (err) {
      console.error("Failed to fetch content data");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        alert("保存成功！");
      } else {
        alert("保存失败");
      }
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const updateValue = (path: string[], value: string) => {
    const newData = { ...data };
    let current: any = newData;
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
    setData(newData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">编辑网站内容</h1>
          <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
            ← 返回
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("hero")}
            className={`px-4 py-2 rounded-lg ${activeTab === "hero" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
          >
            首页横幅
          </button>
          <button
            onClick={() => setActiveTab("sections")}
            className={`px-4 py-2 rounded-lg ${activeTab === "sections" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
          >
            区块标题
          </button>
          <button
            onClick={() => setActiveTab("footer")}
            className={`px-4 py-2 rounded-lg ${activeTab === "footer" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
          >
            页脚
          </button>
          <button
            onClick={() => setActiveTab("social")}
            className={`px-4 py-2 rounded-lg ${activeTab === "social" ? "bg-blue-600 text-white" : "bg-white text-gray-700"}`}
          >
            社交链接
          </button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm space-y-6">
          {activeTab === "hero" && (
            <>
              <h3 className="font-medium text-gray-900 mb-4">温暖风格</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">问候语</label>
                  <input
                    type="text"
                    value={data.hero.warm.greeting}
                    onChange={(e) => updateValue(["hero", "warm", "greeting"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">标题</label>
                  <input
                    type="text"
                    value={data.hero.warm.title}
                    onChange={(e) => updateValue(["hero", "warm", "title"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">标语</label>
                  <input
                    type="text"
                    value={data.hero.warm.tagline}
                    onChange={(e) => updateValue(["hero", "warm", "tagline"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <h3 className="font-medium text-gray-900 mb-4 mt-6">科技风格</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">标题</label>
                  <input
                    type="text"
                    value={data.hero.tech.title}
                    onChange={(e) => updateValue(["hero", "tech", "title"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">标语</label>
                  <input
                    type="text"
                    value={data.hero.tech.tagline}
                    onChange={(e) => updateValue(["hero", "tech", "tagline"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </>
          )}

          {activeTab === "sections" && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">作品区块</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">温暖风格标题</label>
                  <input
                    type="text"
                    value={data.sections.works.warm}
                    onChange={(e) => updateValue(["sections", "works", "warm"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">科技风格标题</label>
                  <input
                    type="text"
                    value={data.sections.works.tech}
                    onChange={(e) => updateValue(["sections", "works", "tech"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">温暖风格副标题</label>
                <input
                  type="text"
                  value={data.sections.works.warmSubtitle}
                  onChange={(e) => updateValue(["sections", "works", "warmSubtitle"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>

              <h3 className="font-medium text-gray-900 mt-6">关于区块</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">温暖风格</label>
                  <input
                    type="text"
                    value={data.sections.about.warm}
                    onChange={(e) => updateValue(["sections", "about", "warm"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">科技风格</label>
                  <input
                    type="text"
                    value={data.sections.about.tech}
                    onChange={(e) => updateValue(["sections", "about", "tech"], e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <h3 className="font-medium text-gray-900 mt-6">联系区块</h3>
              <div>
                <label className="block text-sm text-gray-600 mb-1">标题</label>
                <input
                  type="text"
                  value={data.sections.contact.title}
                  onChange={(e) => updateValue(["sections", "contact", "title"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">温暖风格副标题</label>
                <input
                  type="text"
                  value={data.sections.contact.warmSubtitle}
                  onChange={(e) => updateValue(["sections", "contact", "warmSubtitle"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "footer" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">温暖风格页脚</label>
                <input
                  type="text"
                  value={data.footer.warm}
                  onChange={(e) => updateValue(["footer", "warm"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">科技风格页脚</label>
                <input
                  type="text"
                  value={data.footer.tech}
                  onChange={(e) => updateValue(["footer", "tech"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          {activeTab === "social" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">GitHub</label>
                <input
                  type="text"
                  value={data.socialLinks.github}
                  onChange={(e) => updateValue(["socialLinks", "github"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Email</label>
                <input
                  type="text"
                  value={data.socialLinks.email}
                  onChange={(e) => updateValue(["socialLinks", "email"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">微信</label>
                <input
                  type="text"
                  value={data.socialLinks.weixin}
                  onChange={(e) => updateValue(["socialLinks", "weixin"], e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存更改"}
          </button>
        </div>
      </main>
    </div>
  );
}
