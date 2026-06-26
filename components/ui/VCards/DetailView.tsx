"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MarkdownContent from "@/components/MarkdownContent";

interface DetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  cover?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  type: "work" | "post";
}

export default function DetailView({
  isOpen,
  onClose,
  title,
  content,
  cover,
  meta,
  actions,
  type,
}: DetailViewProps) {
  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="detail-view-container"
        >
          {/* Close Button - Fixed position, won't scroll */}
          <button
            className="detail-close-btn"
            onClick={onClose}
            aria-label="关闭"
          >
            ✕
          </button>

          {/* Scrollable area - everything except close button */}
          <div className="detail-scroll-area">
            {/* Cover Image */}
            {cover && (
              <img
                src={cover}
                alt={title}
                className="detail-cover"
              />
            )}

            {/* Title */}
            <h2 className="detail-title">{title}</h2>

            {/* Meta Information */}
            {meta && <div className="detail-meta">{meta}</div>}

            {/* Actions (demo/repo links) */}
            {actions && <div className="detail-actions">{actions}</div>}

            {/* Content */}
            <div className="detail-content">
              <MarkdownContent content={content} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
