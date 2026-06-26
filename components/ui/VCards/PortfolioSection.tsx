"use client";

import { useState } from "react";
import { ChevronDown, Eye } from "lucide-react";
import DetailView from "./DetailView";

interface Work {
  id: string;
  title: string;
  description?: string;
  cover?: string;
  tech?: string[];
  category?: string;
  content?: string;
  demo?: string;
  repo?: string;
}

interface PortfolioSectionProps {
  works?: Work[];
  isActive?: boolean;
}

export default function PortfolioSection({ works = [], isActive = false }: PortfolioSectionProps) {
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedWork, setSelectedWork] = useState<Work | null>(null);

  // 从项目中提取所有分类
  const categories = ["all", ...new Set(works.map(w => w.category || "other").filter(Boolean))];

  // 过滤项目
  const filteredWorks = activeFilter === "all"
    ? works
    : works.filter(w => (w.category || "other") === activeFilter);

  const handleWorkClick = (work: Work) => {
    setSelectedWork(work);
  };

  const handleCloseDetail = () => {
    setSelectedWork(null);
  };

  return (
    <article className={`portfolio ${isActive ? "active" : ""}`} data-page="portfolio">
      <header className="article-header-sticky">
        <h2 className="h2 article-title">作品集</h2>
      </header>

      <section className="projects">
        {/* 过滤按钮列表 - 只在列表视图显示 */}
        {!selectedWork && (
          <>
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
                  <ChevronDown size={18} />
                </div>
              </button>
            </div>

            <ul className="project-list">
              {filteredWorks.map((work) => (
                <li
                  key={work.id}
                  className={`project-item active ${activeFilter === "all" || (work.category || "other") === activeFilter ? "" : "hidden"}`}
                  data-category={work.category || "other"}
                >
                  <button
                    className="project-item-button"
                    onClick={() => handleWorkClick(work)}
                  >
                    <figure className="project-img">
                      {work.category && (
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
                            {work.category}
                          </span>
                        </div>
                      )}
                      <div className="project-item-icon-box">
                        <Eye size={24} />
                      </div>
                      {work.cover ? (
                        <img src={work.cover} alt={work.title} loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-bg-secondary flex items-center justify-center">
                          暂无图片
                        </div>
                      )}
                    </figure>
                    <h3 className="project-title">{work.title}</h3>
                    <p className="project-category">
                      {work.category || "项目"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* 详情视图 */}
        {selectedWork && (
          <DetailView
            isOpen={!!selectedWork}
            onClose={handleCloseDetail}
            title={selectedWork.title}
            content={selectedWork.content || ""}
            cover={selectedWork.cover}
            type="work"
            meta={
              <div className="flex gap-4 text-sm text-text-secondary">
                <span>{selectedWork.category || ""}</span>
              </div>
            }
            actions={
              <>
                {selectedWork.demo && (
                  <a
                    href={selectedWork.demo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-accent-color text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    查看演示
                  </a>
                )}
                {selectedWork.repo && (
                  <a
                    href={selectedWork.repo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 bg-bg-card border border-border-color text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"
                  >
                    查看代码
                  </a>
                )}
              </>
            }
          />
        )}
      </section>
    </article>
  );
}
