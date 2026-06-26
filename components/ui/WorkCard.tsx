"use client";

import { Work } from "@/types";
import Link from "next/link";
import { ExternalLink, Code } from "lucide-react";

interface WorkCardProps {
  work: Work;
}

export default function WorkCard({ work }: WorkCardProps) {
  return (
    <Link href={`/works/${work.id}`} className="block">
      <article className="card hover:border-accent-primary transition-colors group">
        {/* Image */}
        <div className="relative overflow-hidden bg-bg-secondary rounded-lg mb-4">
          {work.category && (
            <div
              className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-md"
              style={{ backgroundColor: "rgba(18, 18, 23, 0.85)" }}
            >
              <span className="text-xs font-medium" style={{ color: "rgba(255, 255, 255, 0.85)" }}>
                {work.category}
              </span>
            </div>
          )}
          {work.cover ? (
            <img
              src={work.cover}
              alt={work.title}
              className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full aspect-video flex items-center justify-center text-text-muted">
              暂无图片
            </div>
          )}
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors mb-2">
          {work.title}
        </h3>
        <p className="text-text-secondary text-sm line-clamp-2 mb-4">
          {work.description || "暂无描述"}
        </p>

        {/* Tech Tags */}
        {work.tech && work.tech.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {work.tech.slice(0, 3).map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="px-2 py-1 bg-bg-secondary rounded-md text-xs font-medium text-accent-primary"
              >
                {tag}
              </span>
            ))}
            {work.tech.length > 3 && (
              <span className="px-2 py-1 bg-bg-secondary rounded-md text-xs font-medium text-text-muted">
                +{work.tech.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Links */}
        <div className="separator" />

        <div className="flex gap-4 pt-4">
          {work.demo && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <ExternalLink size={14} />
              Demo
            </span>
          )}
          {work.repo && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <Code size={14} />
              Code
            </span>
          )}
        </div>
      </article>
    </Link>
  );
}
