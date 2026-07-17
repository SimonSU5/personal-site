"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { Code, Cpu, Rocket, Globe, FileText, User } from "lucide-react";

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

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage: string;
  onPageChange?: (page: string) => void;
}

export default function AdminLayout({ children, activePage, onPageChange }: AdminLayoutProps) {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [contactItems, setContactItems] = useState<ContactItem[]>([]);

  useEffect(() => {
    checkAuth();
    fetchContactItems();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/check");
      if (res.ok) {
        setAuthenticated(true);
      } else {
        router.push("/admin/login");
      }
    } catch {
      router.push("/admin/login");
    }
  };

  const fetchContactItems = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();
        const socialLinks = data.socialLinks || {};

        // Convert socialLinks object to contactItems array
        const items: ContactItem[] = [];

        // Standard fields with predefined labels
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
          github: { label: "GitHub", icon: "logo-github" },
        };

        // Process standard fields
        Object.entries(fieldMapping).forEach(([key, config]) => {
          if (socialLinks[key]) {
            items.push({
              id: key,
              label: config.label,
              value: socialLinks[key],
              icon: config.icon,
              iconType: "preset" as const,
            });
          }
        });

        // Process custom fields (keys not in fieldMapping)
        Object.entries(socialLinks).forEach(([key, value]) => {
          if (!fieldMapping[key] && value) {
            items.push({
              id: key,
              label: key, // Use the key as the label for custom fields
              value: value as string,
              icon: "ellipse-outline",
              iconType: "preset" as const,
            });
          }
        });

        setContactItems(items);
      }
    } catch {
      console.error("Failed to fetch contact items");
    }
  };

  const handleSetContactItems = (items: ContactItem[]) => {
    setContactItems(items);

    // Convert contactItems back to socialLinks and save
    const socialLinks: Record<string, string> = {};
    items.forEach(item => {
      // Map label to the correct key for socialLinks
      const lowerLabel = item.label.toLowerCase();
      const hasEmail = lowerLabel.includes("email") || lowerLabel.includes("mail") || lowerLabel.includes("邮箱");
      const hasPhone = lowerLabel.includes("phone") || lowerLabel.includes("电话");
      const hasLocation = lowerLabel.includes("location") || lowerLabel.includes("地址");
      const hasBirthday = lowerLabel.includes("birthday") || lowerLabel.includes("生日") || lowerLabel.includes("calendar");
      const hasGithub = lowerLabel.includes("github");

      if (hasEmail) {
        socialLinks.email = item.value;
      } else if (hasPhone) {
        socialLinks.phone = item.value;
      } else if (hasLocation) {
        socialLinks.location = item.value;
      } else if (hasBirthday) {
        socialLinks.birthday = item.value;
      } else if (hasGithub) {
        socialLinks.github = item.value;
      } else {
        // For custom labels, use the label itself as the key
        socialLinks[item.label] = item.value;
      }
    });

    // Save to content.json
    fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ socialLinks }),
    }).catch(console.error);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  const navItems = [
    { id: "content", label: "内容编辑", href: "/admin/content" },
    { id: "resume", label: "简历管理", href: "/admin/resume" },
    { id: "works", label: "作品管理", href: "/admin/works" },
    { id: "blog", label: "博客管理", href: "/admin/blog" },
    { id: "contact", label: "联系管理", href: "/admin/contact" },
    { id: "github", label: "GitHub 同步", href: "/admin/github-settings" },
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        {/* Left Sidebar - Admin Version */}
        <AdminSidebar
          contactItems={contactItems}
          setContactItems={handleSetContactItems}
        />

        {/* Right Main Content */}
        <div className="main-content admin-main flex flex-col h-[850px] w-full overflow-hidden">
          {/* Navigation Bar - Sticky */}
          <nav className="navbar sticky top-0 z-20 bg-bg-card">
            <ul className="navbar-list">
              <li className="navbar-item">
                <a href="/admin/content" className={`navbar-link ${activePage === "content" ? "active" : ""}`}>
                  内容编辑
                </a>
              </li>
              <li className="navbar-item">
                <a href="/admin/resume" className={`navbar-link ${activePage === "resume" ? "active" : ""}`}>
                  简历管理
                </a>
              </li>
              <li className="navbar-item">
                <a href="/admin/works" className={`navbar-link ${activePage === "works" ? "active" : ""}`}>
                  作品管理
                </a>
              </li>
              <li className="navbar-item">
                <a href="/admin/blog" className={`navbar-link ${activePage === "blog" ? "active" : ""}`}>
                  博客管理
                </a>
              </li>
              <li className="navbar-item">
                <a href="/admin/contact" className={`navbar-link ${activePage === "contact" ? "active" : ""}`}>
                  联系管理
                </a>
              </li>
              <li className="navbar-item">
                <a href="/admin/github-settings" className={`navbar-link ${activePage === "github" ? "active" : ""}`}>
                  GitHub 同步
                </a>
              </li>
            </ul>
          </nav>

          {/* Admin Content */}
          {children}
        </div>
      </main>
    </div>
  );
}
