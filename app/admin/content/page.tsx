"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import { Save } from "lucide-react";

interface Service {
  icon: string;
  title: string;
  description: string;
}

interface AboutData {
  greeting: string;
  title: string;
  description: string[];
}

interface HeroData {
  greeting: string;
  title: string;
  tagline: string;
}

interface SocialLinks {
  github?: string;
  email?: string;
  phone?: string;
  location?: string;
  birthday?: string;
  weixin?: string;
}

export default function ContentPage() {
  const router = useRouter();
  const [hero, setHero] = useState<HeroData>({ greeting: "", title: "", tagline: "" });
  const [about, setAbout] = useState<AboutData>({ greeting: "", title: "", description: [] });
  const [services, setServices] = useState<Service[]>([]);
  const [siteName, setSiteName] = useState("Simon");
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [newDescriptionLine, setNewDescriptionLine] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        setHero(data.hero?.warm || { greeting: "", title: "", tagline: "" });
        setAbout(data.about || { greeting: "", title: "", description: [] });
        setServices(data.services || []);
        setSiteName(data.siteName || "Simon");
        setSocialLinks(data.socialLinks || {});
      }
    } catch (err) {
      console.error("Failed to fetch content");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteName,
          hero: {
            warm: hero,
            tech: {
              title: hero.greeting,
              tagline: `${hero.title}——${hero.tagline}`,
            },
          },
          about,
          services,
          socialLinks,
        }),
      });

      if (res.ok) {
        setSaveMessage("保存成功！");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("保存失败，请重试");
      }
    } catch (err) {
      setSaveMessage("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const addDescriptionLine = () => {
    if (newDescriptionLine.trim()) {
      setAbout({
        ...about,
        description: [...about.description, newDescriptionLine.trim()],
      });
      setNewDescriptionLine("");
    }
  };

  const removeDescriptionLine = (index: number) => {
    setAbout({
      ...about,
      description: about.description.filter((_, i) => i !== index),
    });
  };

  const updateService = (index: number, field: keyof Service, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  const addService = () => {
    setServices([...services, { icon: "code-slash-outline", title: "", description: "" }]);
  };

  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  return (
    <AdminLayout activePage="content">
      <article className="admin-content active flex flex-col h-full overflow-hidden">
        <header className="article-header article-header-sticky flex-shrink-0 sticky top-0 z-10 bg-bg-card">
          <div className="flex items-center justify-between">
            <h2 className="h2 article-title">内容编辑</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="admin-btn admin-btn-primary flex items-center"
              style={{ gap: "8px" }}
            >
              <Save size={16} />
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
          {saveMessage && (
            <p className={`text-sm ${saveMessage.includes("成功") ? "text-green-500" : "text-red-500"}`}
              style={{ marginTop: "8px" }}>
              {saveMessage}
            </p>
          )}
        </header>

        <section className="article-content flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
          {/* Site Name */}
          <div className="admin-section">
            <h3 className="text-lg font-semibold">网站名称</h3>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              className="admin-input w-full"
              placeholder="网站名称"
            />
          </div>

          {/* Hero Section */}
          <div className="admin-section">
            <h3 className="text-lg font-semibold">首页标题</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label">问候语</label>
                <input
                  type="text"
                  value={hero.greeting}
                  onChange={(e) => setHero({ ...hero, greeting: e.target.value })}
                  className="admin-input w-full"
                  placeholder="你好，我是..."
                />
              </div>
              <div>
                <label className="form-label">标题</label>
                <input
                  type="text"
                  value={hero.title}
                  onChange={(e) => setHero({ ...hero, title: e.target.value })}
                  className="admin-input w-full"
                  placeholder="网络/硬件/人工智能"
                />
              </div>
              <div>
                <label className="form-label">标语</label>
                <input
                  type="text"
                  value={hero.tagline}
                  onChange={(e) => setHero({ ...hero, tagline: e.target.value })}
                  className="admin-input w-full"
                  placeholder="兴趣引导技术"
                />
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="admin-section">
            <h3 className="text-lg font-semibold">关于我</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label className="form-label">问候语</label>
                <input
                  type="text"
                  value={about.greeting}
                  onChange={(e) => setAbout({ ...about, greeting: e.target.value })}
                  className="admin-input w-full"
                  placeholder="你好"
                />
              </div>
              <div>
                <label className="form-label">自我介绍</label>
                <input
                  type="text"
                  value={about.title}
                  onChange={(e) => setAbout({ ...about, title: e.target.value })}
                  className="admin-input w-full"
                  placeholder="我是一名..."
                />
              </div>
              <div>
                <label className="form-label" style={{ marginTop: 0 }}>详细描述（每行一段）</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {about.description.map((line, index) => (
                    <div key={index} className="flex items-center" style={{ gap: "8px" }}>
                      <input
                        type="text"
                        value={line}
                        onChange={(e) => {
                          const updated = [...about.description];
                          updated[index] = e.target.value;
                          setAbout({ ...about, description: updated });
                        }}
                        className="admin-input flex-1"
                      />
                      <button
                        onClick={() => removeDescriptionLine(index)}
                        className="admin-btn admin-btn-danger"
                        style={{ paddingLeft: "12px", paddingRight: "12px" }}
                      >
                        删除
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center" style={{ gap: "8px" }}>
                    <input
                      type="text"
                      value={newDescriptionLine}
                      onChange={(e) => setNewDescriptionLine(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && addDescriptionLine()}
                      className="admin-input flex-1"
                      placeholder="添加新描述行..."
                    />
                    <button
                      onClick={addDescriptionLine}
                      className="admin-btn admin-btn-secondary"
                      style={{ paddingLeft: "12px", paddingRight: "12px" }}
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="admin-section">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">服务/技能领域</h3>
              <button onClick={addService} className="admin-btn admin-btn-secondary">
                + 添加服务
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {services.map((service, index) => (
                <div key={index} className="bg-bg-card border border-border-color rounded-xl" style={{ padding: "20px 24px" }}>
                  <div className="flex items-start justify-between" style={{ marginBottom: "16px" }}>
                    <span className="text-sm text-text-muted">服务 #{index + 1}</span>
                    {services.length > 1 && (
                      <button
                        onClick={() => removeService(index)}
                        className="text-red-500 hover:text-red-400 text-sm"
                      >
                        删除
                      </button>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div>
                      <label className="form-label" style={{ marginTop: 0 }}>选择图标</label>
                      <select
                        value={service.icon}
                        onChange={(e) => updateService(index, "icon", e.target.value)}
                        className="admin-input w-full"
                      >
                        <option value="language-outline">网络工程</option>
                        <option value="code-slash-outline">全栈开发</option>
                        <option value="hardware-chip-outline">硬件配置</option>
                        <option value="rocket-outline">AI 应用</option>
                        <option value="library-outline">其他</option>
                      </select>
                    </div>
                    <div>
                      <label className="form-label" style={{ marginTop: 0 }}>技能名称</label>
                      <input
                        type="text"
                        value={service.title}
                        onChange={(e) => updateService(index, "title", e.target.value)}
                        className="admin-input w-full"
                        placeholder="服务名称"
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ marginTop: 0 }}>技能描述</label>
                      <textarea
                        value={service.description}
                        onChange={(e) => updateService(index, "description", e.target.value)}
                        className="admin-input w-full min-h-[60px] resize-y"
                        placeholder="服务描述"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </article>
    </AdminLayout>
  );
}
