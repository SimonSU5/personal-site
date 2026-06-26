"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/public/Navbar";
import { StyleProvider, useStyle } from "@/lib/contexts/StyleContext";

function ContactContent() {
  const { style } = useStyle();
  const [submitted, setSubmitted] = useState(false);
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        setContent(data);
      }
    } catch (err) {
      console.error("Failed to fetch content");
    }
  };

  const variants = {
    tech: {
      page: "min-h-screen bg-gray-950 text-gray-100",
      title: "text-4xl font-bold text-cyan-400 mb-4",
      subtitle: "text-gray-400 mb-8",
      input: "w-full px-4 py-3 border border-cyan-500/30 bg-gray-900 text-gray-100 focus:border-cyan-400 outline-none",
      textarea: "w-full px-4 py-3 border border-cyan-500/30 bg-gray-900 text-gray-100 focus:border-cyan-400 outline-none min-h-[150px]",
      button: "px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:from-cyan-400 hover:to-purple-400 transition-all",
      socialCard: "border border-cyan-500/20 bg-gray-900/50 p-6 hover:border-cyan-500/40 transition-all",
      socialTitle: "text-lg font-semibold text-cyan-400",
    },
    warm: {
      page: "min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800",
      title: "text-4xl font-bold text-gray-900 mb-4 text-center",
      subtitle: "text-gray-600 mb-8 text-center",
      input: "w-full px-4 py-3 border border-amber-200 bg-white text-gray-900 rounded-xl focus:border-amber-400 outline-none",
      textarea: "w-full px-4 py-3 border border-amber-200 bg-white text-gray-900 rounded-xl focus:border-amber-400 outline-none min-h-[150px]",
      button: "px-8 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors",
      socialCard: "bg-white rounded-2xl shadow-md p-6 hover:shadow-xl transition-all",
      socialTitle: "text-lg font-semibold text-amber-600",
    },
  };

  const v = variants[style];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  if (!content) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  const socialLinks = [
    { name: "GitHub", url: content.socialLinks.github || "#", icon: "GH" },
    { name: "Email", url: content.socialLinks.email || "#", icon: "✉" },
    { name: "微信", url: content.socialLinks.weixin || "#", icon: "WX" },
  ];

  return (
    <div className={v.page}>
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className={v.title}>{content.sections.contact.title}</h1>
        {style === "warm" && content.sections.contact.warmSubtitle && (
          <p className={v.subtitle}>{content.sections.contact.warmSubtitle}</p>
        )}
        {style === "tech" && (
          <p className={v.subtitle}>
            有问题或合作意向？欢迎通过以下方式联系我
          </p>
        )}

        <div className="grid md:grid-cols-2 gap-12">
          {/* 留言表单 */}
          <div>
            <h2 className={`text-xl font-semibold mb-6 ${style === "tech" ? "text-cyan-400" : ""}`}>
              发送留言
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="你的名字"
                required
                className={v.input}
              />
              <input
                type="email"
                placeholder="你的邮箱"
                required
                className={v.input}
              />
              <textarea
                placeholder="你想说的话..."
                required
                className={v.textarea}
              />
              <button type="submit" className={v.button}>
                {submitted ? "已发送 ✓" : "发送留言"}
              </button>
            </form>
          </div>

          {/* 社交链接 */}
          <div>
            <h2 className={`text-xl font-semibold mb-6 ${style === "tech" ? "text-cyan-400" : ""}`}>
              其他联系方式
            </h2>
            <div className="space-y-4">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block ${v.socialCard}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl ${style === "tech" ? "text-cyan-400" : "text-gray-400"}`}>
                      {link.icon}
                    </span>
                    <span className={v.socialTitle}>{link.name}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-gray-500">
        {content.footer[style]}
      </footer>
    </div>
  );
}

export default function ContactPage() {
  return (
    <StyleProvider>
      <ContactContent />
    </StyleProvider>
  );
}
