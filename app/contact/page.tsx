"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/ui/Sidebar";
import BottomNav from "@/components/ui/VCards/BottomNav";
import ContactSection from "@/components/ui/VCards/ContactSection";

interface ContactItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  iconType?: "preset" | "upload";
}

export default function ContactPage() {
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
              { id: "portfolio", label: "作品" },
              { id: "blog", label: "博客" },
              { id: "contact", label: "联系" },
            ]}
            activeId="contact"
            onNavigate={() => {}}
          />

          {/* Contact Section */}
          <ContactSection
            email={content.socialLinks?.email || ""}
            github={content.socialLinks?.github || ""}
            isActive={true}
          />
        </div>
      </main>
    </div>
  );
}
