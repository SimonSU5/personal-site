"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/ui/Sidebar";
import BottomNav from "@/components/ui/VCards/BottomNav";
import AboutSection from "@/components/ui/VCards/AboutSection";
import ResumeSection from "@/components/ui/VCards/ResumeSection";
import PortfolioSection from "@/components/ui/VCards/PortfolioSection";
import BlogSection from "@/components/ui/VCards/BlogSection";
import ContactSection from "@/components/ui/VCards/ContactSection";
import { Code, Cpu, Rocket, Globe } from "lucide-react";
import { type ObsidianNote } from "@/lib/remark-obsidian";

interface ContactItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  iconType?: "preset" | "upload";
}

// Convert lucide icons to ionicons for display
const iconMap: Record<string, React.ReactNode> = {
  "language-outline": <Globe size={32} />,
  "code-slash-outline": <Code size={32} />,
  "hardware-chip-outline": <Cpu size={32} />,
  "rocket-outline": <Rocket size={32} />,
};

export default function Home() {
  const [content, setContent] = useState<any>(null);
  const [activePage, setActivePage] = useState("about");
  const [works, setWorks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    fetchContent();
    fetchWorks();
    fetchPosts();
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

  const fetchWorks = async () => {
    try {
      const res = await fetch("/api/works");
      if (res.ok) {
        const data = await res.json();
        setWorks(data);
      }
    } catch (err) {
      console.error("Failed to fetch works");
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error("Failed to fetch posts");
    }
  };

  if (!content) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">加载中...</p>
      </div>
    );
  }

  // Convert socialLinks to contactItems
  const contactItems: ContactItem[] = [];
  const socialLinks = content.socialLinks || {};

  const fieldMapping: Record<string, { label: string; icon: string }> = {
    email: { label: "Email", icon: "mail-outline" },
    mail: { label: "Email", icon: "mail-outline" },
    邮箱: { label: "Email", icon: "mail-outline" },
    phone: { label: "Phone", icon: "phone-portrait-outline" },
    电话: { label: "Phone", icon: "phone-portrait-outline" },
    location: { label: "Location", icon: "location-outline" },
    地址: { label: "Location", icon: "location-outline" },
    birthday: { label: "Birthday", icon: "calendar-outline" },
    生日: { label: "Birthday", icon: "calendar-outline" },
    github: { label: "GitHub", icon: "Github" },
  };

  // Process standard fields
  Object.entries(fieldMapping).forEach(([key, config]) => {
    if (socialLinks[key]) {
      contactItems.push({
        id: key,
        label: config.label,
        value: socialLinks[key],
        icon: config.icon,
        iconType: "preset",
      });
    }
  });

  // Process custom fields
  Object.entries(socialLinks).forEach(([key, value]) => {
    if (!fieldMapping[key] && value) {
      contactItems.push({
        id: key,
        label: key,
        value: value as string,
        icon: "ellipse-outline",
        iconType: "preset",
      });
    }
  });

  const navItems = [
    { id: "about", label: "关于" },
    { id: "resume", label: "简历" },
    { id: "portfolio", label: "作品" },
    { id: "blog", label: "博客" },
    { id: "contact", label: "联系" },
  ];

  const services = content.services?.map((s: any) => ({
    icon: iconMap[s.icon] || <Code size={32} />,
    title: s.title,
    description: s.description,
  })) || [];

  // Obsidian 内部链接 [[笔记]] 解析用的笔记清单（博客 + 作品）
  const notes: ObsidianNote[] = [
    ...posts.map((p: any) => ({ id: String(p.id), title: p.title, type: "post" as const })),
    ...works.map((w: any) => ({ id: String(w.id), title: w.title, type: "work" as const })),
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        {/* Left Sidebar */}
        <Sidebar
          name={content.siteName || "Simon"}
          title={content.hero?.warm?.tagline || ""}
          contactItems={contactItems}
        />

        {/* Right Main Content */}
        <div className="main-content">
          {/* Navigation Bar */}
          <BottomNav
            items={navItems}
            activeId={activePage}
            onNavigate={setActivePage}
          />

          {/* About Page */}
          <AboutSection
            greeting={content.about?.greeting}
            title={content.about?.title}
            description={content.about?.description}
            services={services}
            isActive={activePage === "about"}
          />

          {/* Resume Page */}
          <ResumeSection
            education={content.education || []}
            experience={content.experience || []}
            skills={content.skills || []}
            isActive={activePage === "resume"}
          />

          {/* Portfolio Page */}
          <PortfolioSection
            works={works}
            isActive={activePage === "portfolio"}
            notes={notes}
          />

          {/* Blog Page */}
          <BlogSection
            posts={posts}
            isActive={activePage === "blog"}
            notes={notes}
          />

          {/* Contact Page */}
          <ContactSection
            email={content.socialLinks?.email || ""}
            github={content.socialLinks?.github || ""}
            isActive={activePage === "contact"}
          />
        </div>
      </main>
    </div>
  );
}
