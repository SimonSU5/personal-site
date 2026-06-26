"use client";

import { useState } from "react";
import { User, ChevronDown, Mail, Phone, MapPin, Calendar, Home, GitCommit} from "lucide-react";

interface ContactItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  iconType?: "preset" | "upload";
}

interface SidebarProps {
  name: string;
  title: string;
  contactItems?: ContactItem[];
}

// Icon mapping for labels
const getIconComponent = (label: string) => {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("email") || lowerLabel.includes("mail") || lowerLabel.includes("邮箱")) {
    return <Mail size={20} className="text-accent-primary" />;
  }
  if (lowerLabel.includes("phone") || lowerLabel.includes("电话")) {
    return <Phone size={20} className="text-accent-primary" />;
  }
  if (lowerLabel.includes("location") || lowerLabel.includes("地址")) {
    return <MapPin size={20} className="text-accent-primary" />;
  }
  if (lowerLabel.includes("birthday") || lowerLabel.includes("生日") || lowerLabel.includes("calendar")) {
    return <Calendar size={20} className="text-accent-primary" />;
  }
  if (lowerLabel.includes("github")) {
    return <GitCommit size={20} className="text-accent-primary" />;
  }
  return <Mail size={20} className="text-accent-primary" />;
};

export default function Sidebar({
  name,
  title,
  contactItems = [],
}: SidebarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className={`sidebar ${expanded ? "active" : ""}`} data-sidebar>
      <div className="sidebar-info">
        {/* Avatar */}
        <figure className="avatar-box">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary flex items-center justify-center">
            <User size={40} className="text-accent-primary" />
          </div>
        </figure>

        {/* Name and Title */}
        <div className="info-content">
          <h1 className="name" title={name}>{name}</h1>
          <p className="title">{title}</p>
        </div>

        {/* Expand Button */}
        <button
          className="info_more-btn"
          data-sidebar-btn
          onClick={() => setExpanded(!expanded)}
        >
          <span>Show Contacts</span>
          <ChevronDown size={20} className="text-accent-primary" />
        </button>
      </div>

      {/* Expanded Contact Info */}
      <div className="sidebar-info_more">
        <div className="separator" />

        {/* Contact List */}
        <ul className="contacts-list">
          {contactItems.map((item) => (
            <li key={item.id} className="contact-item">
              <div className="icon-box">
                {item.iconType === "upload" && item.icon ? (
                  <img src={item.icon} alt="" className="w-5 h-5" />
                ) : (
                  getIconComponent(item.label)
                )}
              </div>
              <div className="contact-info">
                <p className="contact-title">{item.label}</p>
                {item.value.startsWith("http") ? (
                  <a
                    href={item.value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-link"
                  >
                    {item.value.replace(/^https?:\/\//, "")}
                  </a>
                ) : item.value.includes("@") ? (
                  <a href={`mailto:${item.value}`} className="contact-link">
                    {item.value}
                  </a>
                ) : (
                  <span className="contact-link">{item.value}</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="separator" />

        {/* Social Links */}
        <ul className="social-list">
          <li className="social-item">
            <a href="/" className="social-link" title="返回首页">
              <Home size={20} />
            </a>
          </li>
        </ul>
      </div>
    </aside>
  );
}
