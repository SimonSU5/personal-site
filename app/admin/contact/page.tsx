"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Plus, Trash2, Mail, MapPin, Phone, Calendar, MessageCircle } from "lucide-react";

interface SocialLink {
  platform: string;
  url: string;
  icon: string;
}

interface ContactField {
  id: string;
  label: string;
  type: "text" | "email" | "tel" | "textarea";
  required: boolean;
}

export default function ContactPage() {
  const router = useRouter();
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [contactFields, setContactFields] = useState<ContactField[]>([]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [birthday, setBirthday] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [newSocial, setNewSocial] = useState({ platform: "", url: "", icon: "" });

  useEffect(() => {
    checkAuth();
    fetchContent();
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

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        const links: SocialLink[] = [];
        if (data.socialLinks?.github) {
          links.push({ platform: "GitHub", url: data.socialLinks.github, icon: "logo-github" });
        }
        if (data.socialLinks?.email) {
          setEmail(data.socialLinks.email);
        }
        if (data.socialLinks?.phone) {
          setPhone(data.socialLinks.phone);
        }
        if (data.socialLinks?.location) {
          setLocation(data.socialLinks.location);
        }
        if (data.socialLinks?.birthday) {
          setBirthday(data.socialLinks.birthday);
        }
        setSocialLinks(links);
      }
    } catch (err) {
      console.error("Failed to fetch content");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      const socialLinksMap: Record<string, string> = {};
      socialLinks.forEach(link => {
        socialLinksMap[link.platform.toLowerCase()] = link.url;
      });

      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socialLinks: {
            github: socialLinks.find(l => l.platform === "GitHub")?.url || "",
            email,
            phone,
            location,
            birthday,
          },
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

  const addSocialLink = () => {
    if (newSocial.platform && newSocial.url) {
      setSocialLinks([...socialLinks, { ...newSocial }]);
      setNewSocial({ platform: "", url: "", icon: "" });
    }
  };

  const removeSocialLink = (index: number) => {
    setSocialLinks(socialLinks.filter((_, i) => i !== index));
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
                <Link href="/admin/blog" className="navbar-link">
                  博客管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/contact" className="navbar-link active">
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
              <div className="flex items-center justify-between">
                <h2 className="h2 article-title">联系管理</h2>
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
              {/* Basic Contact Info */}
              <div className="admin-section">
                <h3 className="text-lg font-semibold">基本信息</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="flex items-center"
                  style={{ gap: "12px" }}>
                    <Mail size={18} className="text-text-muted" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="admin-input flex-1"
                      placeholder="邮箱地址"
                    />
                  </div>
                  <div className="flex items-center"
                  style={{ gap: "12px" }}>
                    <Phone size={18} className="text-text-muted" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="admin-input flex-1"
                      placeholder="电话号码"
                    />
                  </div>
                  <div className="flex items-center"
                  style={{ gap: "12px" }}>
                    <MapPin size={18} className="text-text-muted" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="admin-input flex-1"
                      placeholder="所在地址"
                    />
                  </div>
                  <div className="flex items-center"
                  style={{ gap: "12px" }}>
                    <Calendar size={18} className="text-text-muted" />
                    <input
                      type="text"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="admin-input flex-1"
                      placeholder="生日"
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div className="admin-section">
                <h3 className="text-lg font-semibold">社交链接</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {socialLinks.map((link, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
                        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1-.5-4-1.5.5 0 1.5-2.5 0 0 .5 1 1.5 2.5 3 2 5.5 1.5 6 .5.5 0 1 1.5 1.5 3 2 5.5 1.5 6-.5 1-1.5 2-3 2-5.5.08-1.25-.27-2.48-1-3.5 0 0-1-.5-4 1.5-3.5-3.5-6-6-6-6 1.5-1.5 2-2.5 2-3.5V22"/>
                      </svg>
                      <input
                        type="text"
                        value={link.platform}
                        onChange={(e) => {
                          const updated = [...socialLinks];
                          updated[index].platform = e.target.value;
                          setSocialLinks(updated);
                        }}
                        className="admin-input w-32"
                        placeholder="平台"
                      />
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...socialLinks];
                          updated[index].url = e.target.value;
                          setSocialLinks(updated);
                        }}
                        className="admin-input flex-1"
                        placeholder="链接"
                      />
                      <button
                        onClick={() => removeSocialLink(index)}
                        className="admin-btn admin-btn-danger"
                        style={{ paddingLeft: "12px", paddingRight: "12px" }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center"
                  style={{ gap: "12px" }}>
                    <Plus size={18} className="text-text-muted" />
                    <input
                      type="text"
                      value={newSocial.platform}
                      onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })}
                      className="admin-input w-32"
                      placeholder="平台"
                    />
                    <input
                      type="url"
                      value={newSocial.url}
                      onChange={(e) => setNewSocial({ ...newSocial, url: e.target.value })}
                      className="admin-input flex-1"
                      placeholder="链接"
                    />
                    <button
                      onClick={addSocialLink}
                      className="admin-btn admin-btn-secondary"
                    >
                      添加
                    </button>
                  </div>
                </div>
              </div>

              {/* Contact Form Fields */}
              <div className="admin-section">
                <h3 className="text-lg font-semibold">联系表单字段</h3>
                <p className="text-text-secondary text-sm"
                style={{ marginBottom: "16px" }}>
                  管理联系表单的字段配置
                </p>
                <div className="bg-bg-secondary rounded-xl border border-border-color"
                style={{ padding: "16px" }}>
                  <div className="flex items-center justify-between"
                  style={{ marginBottom: "16px" }}>
                    <span className="text-sm text-text-muted">当前表单字段</span>
                    <button className="admin-btn admin-btn-secondary text-sm">
                      + 添加字段
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div className="flex items-center justify-between bg-bg-card rounded-lg"
                    style={{ padding: "8px" }}>
                      <span className="text-sm">姓名</span>
                      <span className="text-xs bg-bg-secondary rounded"
                      style={{ paddingLeft: "8px", paddingRight: "8px", paddingTop: "4px", paddingBottom: "4px" }}>必填</span>
                    </div>
                    <div className="flex items-center justify-between bg-bg-card rounded-lg"
                    style={{ padding: "8px" }}>
                      <span className="text-sm">邮箱</span>
                      <span className="text-xs bg-bg-secondary rounded"
                      style={{ paddingLeft: "8px", paddingRight: "8px", paddingTop: "4px", paddingBottom: "4px" }}>必填</span>
                    </div>
                    <div className="flex items-center justify-between bg-bg-card rounded-lg"
                    style={{ padding: "8px" }}>
                      <span className="text-sm">消息</span>
                      <span className="text-xs bg-bg-secondary rounded"
                      style={{ paddingLeft: "8px", paddingRight: "8px", paddingTop: "4px", paddingBottom: "4px" }}>必填</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
