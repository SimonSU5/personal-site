"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/ui/Sidebar";
import BottomNav from "@/components/ui/VCards/BottomNav";
import ResumeSection from "@/components/ui/VCards/ResumeSection";
import { Code, Cpu, Rocket, Globe } from "lucide-react";

interface ContactItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  iconType?: "preset" | "upload";
}

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
}

// Convert lucide icons to ionicons for display
const iconMap: Record<string, React.ReactNode> = {
  "language-outline": <Globe size={32} />,
  "code-slash-outline": <Code size={32} />,
  "hardware-chip-outline": <Cpu size={32} />,
  "rocket-outline": <Rocket size={32} />,
};

export default function AboutPage() {
  const [content, setContent] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchContent = async () => {
      try {
        const res = await fetch("/api/content");
        if (res.ok) {
          const data = await res.json();
          setContent(data);
        }
      } catch (err) {
        console.error("Failed to fetch content", err);
      }
    };
    fetchContent();
  }, []);

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

  const services: Service[] = content.services?.map((s: any) => ({
    icon: iconMap[s.icon] || <Code size={32} />,
    title: s.title,
    description: s.description,
  })) || [];

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
            items={[
              { id: "about", label: "关于" },
              { id: "resume", label: "简历" },
            ]}
            activeId="about"
            onNavigate={() => {}}
          />

          {/* About Section */}
          <article className="about active" data-page="about">
            <header>
              <h2 className="h2 article-title">关于我</h2>
            </header>

            {/* About Text */}
            <section className="about-text">
              <p>
                <strong>{content.about?.greeting || ""}</strong>
              </p>
              <p>{content.about?.title || ""}</p>
              {content.about?.description?.map((line: string, index: number) => (
                <p key={index}>{line}</p>
              ))}
            </section>

            {/* Services */}
            <section className="service">
              <h3 className="h3 service-title">服务领域</h3>
              <ul className="service-list">
                {services.map((service, index) => (
                  <li className="service-item" key={index}>
                    <div className="service-icon-box">{service.icon}</div>
                    <div className="service-content-box">
                      <h4 className="h4 service-item-title">{service.title}</h4>
                      <p className="service-item-text">{service.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </article>

          {/* Resume Section */}
          <ResumeSection
            education={content.education || []}
            experience={content.experience || []}
            skills={content.skills || []}
            isActive={false}
          />
        </div>
      </main>
    </div>
  );
}
