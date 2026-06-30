"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        <header className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-semibold text-text-primary">编辑网站内容</h1>
          <div style={{ width: "80px" }}></div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("hero")}
            className={`px-4 py-2 rounded-lg ${activeTab === "hero" ? "admin-btn admin-btn-primary" : "bg-bg-card text-text-secondary"}`}
          >
            首页横幅
          </button>
          <button
            onClick={() => setActiveTab("sections")}
            className={`px-4 py-2 rounded-lg ${activeTab === "sections" ? "admin-btn admin-btn-primary" : "bg-bg-card text-text-secondary"}`}
          >
            区块标题
          </button>
          <button
            onClick={() => setActiveTab("footer")}
            className={`px-4 py-2 rounded-lg ${activeTab === "footer" ? "admin-btn admin-btn-primary" : "bg-bg-card text-text-secondary"}`}
          >
            页脚
          </button>
          <button
            onClick={() => setActiveTab("social")}
            className={`px-4 py-2 rounded-lg ${activeTab === "social" ? "admin-btn admin-btn-primary" : "bg-bg-card text-text-secondary"}`}
          >
            社交链接
          </button>
        </div>

        <div className="admin-content active" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {activeTab === "hero" && (
            <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 className="text-text-primary font-medium">温暖风格</h3>
              <div>
                <label className="block text-sm text-text-secondary mb-1">问候语</label>
                <input
                  type="text"
                  value={data.hero.warm.greeting}
                  onChange={(e) => updateValue(["hero", "warm", "greeting"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">标题</label>
                <input
                  type="text"
                  value={data.hero.warm.title}
                  onChange={(e) => updateValue(["hero", "warm", "title"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">标语</label>
                <input
                  type="text"
                  value={data.hero.warm.tagline}
                  onChange={(e) => updateValue(["hero", "warm", "tagline"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>

              <h3 className="text-text-primary font-medium mt-2">科技风格</h3>
              <div>
                <label className="block text-sm text-text-secondary mb-1">标题</label>
                <input
                  type="text"
                  value={data.hero.tech.title}
                  onChange={(e) => updateValue(["hero", "tech", "title"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">标语</label>
                <input
                  type="text"
                  value={data.hero.tech.tagline}
                  onChange={(e) => updateValue(["hero", "tech", "tagline"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>
          )}

          {activeTab === "sections" && (
            <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <h3 className="text-text-primary font-medium">作品区块</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">温暖风格标题</label>
                  <input
                    type="text"
                    value={data.sections.works.warm}
                    onChange={(e) => updateValue(["sections", "works", "warm"], e.target.value)}
                    className="admin-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">科技风格标题</label>
                  <input
                    type="text"
                    value={data.sections.works.tech}
                    onChange={(e) => updateValue(["sections", "works", "tech"], e.target.value)}
                    className="admin-input w-full"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">温暖风格副标题</label>
                <input
                  type="text"
                  value={data.sections.works.warmSubtitle}
                  onChange={(e) => updateValue(["sections", "works", "warmSubtitle"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>

              <h3 className="text-text-primary font-medium mt-2">关于区块</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1">温暖风格</label>
                  <input
                    type="text"
                    value={data.sections.about.warm}
                    onChange={(e) => updateValue(["sections", "about", "warm"], e.target.value)}
                    className="admin-input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-1">科技风格</label>
                  <input
                    type="text"
                    value={data.sections.about.tech}
                    onChange={(e) => updateValue(["sections", "about", "tech"], e.target.value)}
                    className="admin-input w-full"
                  />
                </div>
              </div>

              <h3 className="text-text-primary font-medium mt-2">联系区块</h3>
              <div>
                <label className="block text-sm text-text-secondary mb-1">标题</label>
                <input
                  type="text"
                  value={data.sections.contact.title}
                  onChange={(e) => updateValue(["sections", "contact", "title"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">温暖风格副标题</label>
                <input
                  type="text"
                  value={data.sections.contact.warmSubtitle}
                  onChange={(e) => updateValue(["sections", "contact", "warmSubtitle"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>
          )}

          {activeTab === "footer" && (
            <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="block text-sm text-text-secondary mb-1">温暖风格页脚</label>
                <input
                  type="text"
                  value={data.footer.warm}
                  onChange={(e) => updateValue(["footer", "warm"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">科技风格页脚</label>
                <input
                  type="text"
                  value={data.footer.tech}
                  onChange={(e) => updateValue(["footer", "tech"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>
          )}

          {activeTab === "social" && (
            <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="block text-sm text-text-secondary mb-1">GitHub</label>
                <input
                  type="text"
                  value={data.socialLinks.github}
                  onChange={(e) => updateValue(["socialLinks", "github"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Email</label>
                <input
                  type="text"
                  value={data.socialLinks.email}
                  onChange={(e) => updateValue(["socialLinks", "email"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">微信</label>
                <input
                  type="text"
                  value={data.socialLinks.weixin}
                  onChange={(e) => updateValue(["socialLinks", "weixin"], e.target.value)}
                  className="admin-input w-full"
                />
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="admin-btn admin-btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {saving ? "保存中..." : "保存更改"}
          </button>
        </div>
      </main>
    </div>
  );
}
