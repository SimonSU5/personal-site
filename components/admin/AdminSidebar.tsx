"use client";

import { useState, useEffect } from "react";
import { User, Plus, Trash2, ChevronDown, Home, Mail, MapPin, Phone, Calendar } from "lucide-react";

interface ContactItem {
  id: string;
  label: string;
  value: string;
  icon?: string;
  iconType?: "preset" | "upload";
}

interface AdminSidebarProps {
  contactItems?: ContactItem[];
  setContactItems?: (items: ContactItem[]) => void;
  isEditing?: boolean;
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
    return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1-.5-4-1.5.5 0 1.5-2.5 0 0 .5 1 1.5 2.5 3 2 5.5 1.5 6 .5.5 0 1 1.5 1.5 3 2 5.5 1.5 6-.5 1-1.5 2-3 2-5.5.08-1.25-.27-2.48-1-3.5 0 0-1-.5-4 1.5-3.5-3.5-6-6-6-6 1.5-1.5 2-2.5 2-3.5V22"/>
    </svg>;
  }
  return <Mail size={20} className="text-accent-primary" />;
};

export default function AdminSidebar({
  contactItems: initialContactItems = [],
  setContactItems,
  isEditing = true,
}: AdminSidebarProps) {
  const [expanded, setExpanded] = useState(false);
  const [contactItems, setLocalContactItems] = useState<ContactItem[]>(initialContactItems);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ label: "", value: "", icon: "" });
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Sync local state with prop changes
  useEffect(() => {
    setLocalContactItems(initialContactItems);
  }, [initialContactItems]);

  const handleAddItem = () => {
    if (newItem.label && newItem.value) {
      const item: ContactItem = {
        id: Date.now().toString(),
        label: newItem.label,
        value: newItem.value,
        icon: newItem.icon,
        iconType: "preset",
      };
      const updated = [...contactItems, item];
      setLocalContactItems(updated);
      if (setContactItems) {
        setContactItems(updated);
      }
      setNewItem({ label: "", value: "", icon: "" });
      setShowAddForm(false);
    }
  };

  const handleDeleteItem = (id: string) => {
    const updated = contactItems.filter((item) => item.id !== id);
    setLocalContactItems(updated);
    if (setContactItems) {
      setContactItems(updated);
    }
  };

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
          <h1 className="name">管理员</h1>
          <p className="title">后台管理</p>
        </div>

        {/* Expand Button */}
        <button
          className="info_more-btn"
          data-sidebar-btn
          onClick={() => setExpanded(!expanded)}
        >
          <span>联系方式</span>
          <ChevronDown size={20} className="text-accent-primary" />
        </button>
      </div>

      {/* Expanded Contact Info */}
      <div className="sidebar-info_more">
        <div className="separator" />

        {/* Contact List with Edit/Delete */}
        <ul className="contacts-list">
          {contactItems.map((item) => (
            <li
              key={item.id}
              className={`contact-item ${isEditing ? "contact-item-edit" : ""}`}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
            >
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
              {isEditing && hoveredItem === item.id && (
                <button
                  className="delete-btn"
                  onClick={() => handleDeleteItem(item.id)}
                  title="删除"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </li>
          ))}

          {/* Add Contact Button */}
          {isEditing && showAddForm && (
            <li className="contact-item-edit bg-bg-secondary/50 rounded-lg p-3">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="标签 (如: Email, 微信)"
                  value={newItem.label}
                  onChange={(e) => setNewItem({ ...newItem, label: e.target.value })}
                  className="admin-input w-full text-sm py-1 px-2"
                />
                <input
                  type="text"
                  placeholder="值"
                  value={newItem.value}
                  onChange={(e) => setNewItem({ ...newItem, value: e.target.value })}
                  className="admin-input w-full text-sm py-1 px-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddItem}
                    className="admin-btn admin-btn-primary text-xs py-1 px-3"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewItem({ label: "", value: "", icon: "" });
                    }}
                    className="admin-btn text-xs py-1 px-3"
                  >
                    取消
                  </button>
                </div>
              </div>
            </li>
          )}
        </ul>

        {/* Add Button */}
        {isEditing && !showAddForm && (
          <button
            className="add-icon-btn mx-auto"
            style={{ marginTop: "25px" }}
            onClick={() => setShowAddForm(true)}
            title="添加联系方式"
          >
            <Plus size={18} />
          </button>
        )}

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
