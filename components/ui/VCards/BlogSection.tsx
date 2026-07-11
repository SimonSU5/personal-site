"use client";

import { useState } from "react";
import DetailView from "./DetailView";
import { type ObsidianNote } from "@/lib/remark-obsidian";

interface Post {
  id: string;
  title: string;
  excerpt?: string;
  category?: string;
  date?: string;
  readTime?: string;
  cover?: string;
  content?: string;
}

interface BlogSectionProps {
  posts?: Post[];
  isActive?: boolean;
  notes?: ObsidianNote[];
}

export default function BlogSection({ posts = [], isActive = false, notes }: BlogSectionProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // 从博客中提取所有分类
  const categories = ["all", ...new Set(posts.map(p => p.category || "other").filter(Boolean))];

  // 过滤博客
  const filteredPosts = activeFilter === "all"
    ? posts
    : posts.filter(p => (p.category || "other") === activeFilter);

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleCloseDetail = () => {
    setSelectedPost(null);
  };

  return (
    <article className={`blog ${isActive ? "active" : ""}`} data-page="blog">
      <header className="article-header-sticky">
        <h2 className="h2 article-title">博客</h2>
      </header>

      <section className="blog-posts">
        {!selectedPost ? (
          <>
            {/* 分类筛选导航栏 */}
            <ul className="filter-list">
              {categories.map((category) => (
                <li key={category} className="filter-item">
                  <button
                    className={activeFilter === category ? "active" : ""}
                    onClick={() => setActiveFilter(category)}
                  >
                    {category === "all" ? "全部" : category}
                  </button>
                </li>
              ))}
            </ul>

            {/* 移动端下拉选择 */}
            <div className="filter-select-box">
              <button
                className={`filter-select ${activeFilter !== "all" ? "active" : ""}`}
              >
                <div className="select-value">
                  {activeFilter === "all" ? "Select category" : activeFilter}
                </div>
                <div className="select-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </div>
              </button>
            </div>

            <ul className="blog-posts-list">
              {filteredPosts.map((post) => (
                <li key={post.id} className="blog-post-item">
                  <button
                    className="blog-post-button"
                    onClick={() => handlePostClick(post)}
                  >
                    {post.cover ? (
                      <figure className="blog-banner-box" style={{ position: "relative" }}>
                        {post.category && (
                          <div
                            className="category-tag"
                            style={{
                              position: "absolute",
                              top: "12px",
                              left: "12px",
                              zIndex: 10,
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "rgba(18, 18, 23, 0.85)"
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "rgba(255, 255, 255, 0.85)"
                              }}
                            >
                              {post.category}
                            </span>
                          </div>
                        )}
                        <img src={post.cover} alt={post.title} loading="lazy" />
                      </figure>
                    ) : (
                      <div className="blog-banner-box bg-bg-secondary flex items-center justify-center" style={{ position: "relative" }}>
                        {post.category && (
                          <div
                            className="category-tag"
                            style={{
                              position: "absolute",
                              top: "12px",
                              left: "12px",
                              zIndex: 10,
                              padding: "4px 10px",
                              borderRadius: "6px",
                              backgroundColor: "rgba(18, 18, 23, 0.85)"
                            }}
                          >
                            <span
                              style={{
                                fontSize: "12px",
                                fontWeight: 500,
                                color: "rgba(255, 255, 255, 0.85)"
                              }}
                            >
                              {post.category}
                            </span>
                          </div>
                        )}
                        暂无图片
                      </div>
                    )}

                    <div className="blog-content">
                      <div className="blog-meta">
                        <p className="blog-category">{post.category || "技术"}</p>
                        <span className="dot"></span>
                        <time dateTime={post.date || ""}>
                          {post.date || ""}
                        </time>
                      </div>
                      <h3 className="h3 blog-item-title">{post.title}</h3>
                      <p className="blog-text">
                        {post.excerpt || "暂无摘要"}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <DetailView
            isOpen={!!selectedPost}
            onClose={handleCloseDetail}
            title={selectedPost.title}
            content={selectedPost.content || ""}
            cover={selectedPost.cover}
            type="post"
            notes={notes}
            meta={
              <div className="flex gap-4 text-sm text-text-secondary">
                <span>{selectedPost.date || ""}</span>
                <span>·</span>
                <span>{selectedPost.category || ""}</span>
                <span>·</span>
                <span>{selectedPost.readTime || ""}阅读</span>
              </div>
            }
          />
        )}
      </section>
    </article>
  );
}
