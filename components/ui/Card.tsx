"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  variant?: "default" | "gradient-border" | "elevated" | "flat";
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({
  children,
  variant = "default",
  className = "",
  hover = false,
  onClick,
}: CardProps) {
  const cardStyles = {
    default: "bg-bg-card border border-border-color rounded-xl",
    "gradient-border": "gradient-border-card",
    elevated: "bg-bg-card border border-border-color rounded-xl shadow-lg",
    flat: "bg-bg-secondary rounded-xl",
  };

  const baseClass = variant === "gradient-border"
    ? "gradient-border-card"
    : cardStyles[variant];

  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : {}}
      className={`${baseClass} ${hover ? "cursor-pointer" : ""} ${onClick ? "cursor-pointer" : ""} ${className}`}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

// 渐变边框卡片样式
export function GradientBorderCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`gradient-border-card ${className}`}>
      {children}
    </div>
  );
}

// 内容卡片（带标题的卡片）
interface ContentCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  variant?: "default" | "gradient-border";
}

export function ContentCard({
  title,
  subtitle,
  children,
  className = "",
  variant = "default",
}: ContentCardProps) {
  const cardInner = variant === "gradient-border" ? (
    <>
      <div className="gradient-border-card">
        <div className="bg-bg-card rounded-xl p-5">
          {(title || subtitle) && (
            <div className="mb-4">
              {title && (
                <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-text-muted mt-1">{subtitle}</p>
              )}
            </div>
          )}
          {children}
        </div>
      </div>
    </>
  ) : (
    <div className={`bg-bg-card border border-border-color rounded-xl p-5 ${className}`}>
      {(title || subtitle) && (
        <div className="mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-text-muted mt-1">{subtitle}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );

  return cardInner;
}

// 侧边栏卡片
export function SidebarCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-bg-card border border-border-color rounded-2xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
