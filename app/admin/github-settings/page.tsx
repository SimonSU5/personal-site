"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export default function GithubSettingsPage() {
  const router = useRouter();
  const [githubRepo, setGithubRepo] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [useEnvToken, setUseEnvToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAuth();
    fetchSettings();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/check");
      if (!res.ok) router.push("/admin/login");
    } catch {
      router.push("/admin/login");
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/github/settings");
      if (res.ok) {
        const data = await res.json();
        setGithubRepo(data.githubRepo || "");
        setUseEnvToken(data.useEnvToken || false);
      }
    } catch (err) {
      console.error("Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/github/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubRepo, githubToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "保存失败");
      }

      alert("保存成功！");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setSyncResult(null);

    try {
      const res = await fetch("/api/github/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubRepo,
          ...(githubToken && !useEnvToken ? { githubToken } : {})
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "同步失败");
      }

      setSyncResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <p className="text-text-muted">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        {/* Admin Sidebar - Simplified */}
        <aside className="sidebar">
          <div className="sidebar-info">
            <figure className="avatar-box">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-primary">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1-.5-4-1.5.5 0 1.5-2.5 0 0 .5 1 1.5 2.5 3 2 5.5 1.5 6 .5.5 0 1 1.5 1.5 3 2 5.5 1.5 6 .5.5 1 1.5 1.5 3 2 5.5 1.5 6-.5 1-1.5 2-3 2-5.5.08-1.25-.27-2.48-1-3.5 0 0-1-.5-4 1.5-3.5-3.5-6-6-6-6 1.5-1.5 2-2.5 2-3.5V22"/>
                </svg>
              </div>
            </figure>
            <div className="info-content">
              <h1 className="name">GitHub</h1>
              <p className="title">同步配置</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="main-content flex flex-col h-[850px] w-full overflow-hidden">
          <nav className="navbar sticky top-0 z-20 bg-bg-card">
            <ul className="navbar-list">
              <li className="navbar-item">
                <Link href="/admin/content" className="navbar-link">
                  内容编辑
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/resume" className="navbar-link">
                  简历管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/works" className="navbar-link">
                  作品管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/blog" className="navbar-link">
                  博客管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/contact" className="navbar-link">
                  联系管理
                </Link>
              </li>
              <li className="navbar-item">
                <Link href="/admin/github-settings" className="navbar-link active">
                  GitHub 同步
                </Link>
              </li>
            </ul>
          </nav>

          <article className="admin-content active flex flex-col h-full overflow-hidden">
            <header className="article-header article-header-sticky flex-shrink-0 sticky top-0 z-10 bg-bg-card">
              <h2 className="h2 article-title">GitHub 同步设置</h2>
            </header>

            <section className="article-content flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5"
            style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              {/* 配置表单 */}
              <div className="admin-section">
                <h3 className="text-lg font-semibold"
                style={{ marginBottom: "16px" }}>连接 GitHub 仓库</h3>

                <form onSubmit={handleSave}
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="form-label">
                      GitHub 仓库
                      <span className="text-text-muted font-normal ml-2">
                        (格式: username/repo-name)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={githubRepo}
                      onChange={(e) => setGithubRepo(e.target.value)}
                      placeholder="例如: SimonSU5/personal-site-content"
                      className="admin-input w-full"
                    />
                  </div>

                  {!useEnvToken ? (
                    <div>
                      <label className="form-label">
                        GitHub Personal Access Token
                        <span className="text-text-muted font-normal ml-2">
                          (需要 repo 权限)
                        </span>
                      </label>
                      <input
                        type="password"
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                        placeholder="ghp_xxxxxxxxxxxx"
                        className="admin-input w-full"
                      />
                      <p className="text-sm text-text-muted"
                      style={{ marginTop: "8px" }}>
                        在 GitHub Settings → Developer settings → Personal access tokens 中创建
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-900/20 rounded-lg border border-green-500/30"
                    style={{ padding: "16px" }}>
                      <div className="flex items-center"
                      style={{ gap: "8px" }}>
                        <CheckCircle size={18} className="text-green-500" />
                        <span className="text-sm font-medium text-green-400">环境变量已配置</span>
                      </div>
                      <p className="text-sm text-green-300/80"
                      style={{ marginTop: "4px" }}>
                        正在使用环境变量 GITHUB_TOKEN，无需手动输入
                      </p>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center bg-red-900/20 text-red-400 rounded-lg text-sm border border-red-500/30"
                    style={{ gap: "8px", padding: "12px" }}>
                      <AlertCircle size={16} />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={saving}
                    className="admin-btn admin-btn-primary"
                  >
                    {saving ? "保存中..." : "保存配置"}
                  </button>
                </form>
              </div>

              {/* 手动同步 */}
              <div className="admin-section">
                <h3 className="text-lg font-semibold mb-4">手动同步</h3>
                <p className="text-text-secondary mb-4">
                  点击下方按钮从 GitHub 同步博客文章和作品集数据
                </p>

                <button
                  onClick={handleSync}
                  disabled={syncing || !githubRepo || (!useEnvToken && !githubToken)}
                  className="admin-btn admin-btn-secondary flex items-center"
                  style={{ gap: "8px" }}
                >
                  <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
                  {syncing ? "同步中..." : useEnvToken ? "立即同步（使用环境变量）" : "立即同步"}
                </button>

                {useEnvToken && (
                  <p className="text-sm text-green-400 mt-2">
                    ✓ 已配置环境变量 GITHUB_TOKEN，无需手动输入
                  </p>
                )}

                {syncResult && (
                  <div className="bg-green-900/20 rounded-lg border border-green-500/30"
                  style={{ marginTop: "16px", padding: "16px" }}>
                    <p className="text-green-400 font-medium"
                    style={{ marginBottom: "8px" }}>同步成功！</p>
                    <p className="text-sm text-text-secondary">
                      同步了 {syncResult.posts?.length || 0} 篇博客文章
                    </p>
                    <p className="text-sm text-text-secondary">
                      同步了 {syncResult.works?.length || 0} 个作品
                    </p>
                    <p className="text-sm text-text-secondary">
                      同步了 {syncResult.assetsSynced ?? 0} 个 assets 附件
                      {syncResult.assetsFailed ? `（${syncResult.assetsFailed} 个失败）` : ""}
                    </p>
                    {syncResult.assetsTruncated && (
                      <p className="text-sm text-yellow-400">
                        ⚠️ assets 列表被 GitHub 截断，可能有文件未同步
                      </p>
                    )}
                    <p className="text-xs text-text-muted mt-2">
                      时间: {new Date(syncResult.timestamp).toLocaleString("zh-CN")}
                    </p>
                  </div>
                )}
              </div>

              {/* 使用说明 */}
              <div className="admin-section">
                <h3 className="text-lg font-semibold mb-4">使用说明</h3>

                <div className="text-text-secondary"
                style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <h4 className="font-medium text-text-primary mb-2">1. 仓库结构</h4>
                    <pre className="bg-bg-card rounded-lg text-sm overflow-x-auto border border-border-color"
                    style={{ padding: "12px" }}>
{`personal-site-content/
├── blogs/                    # 博客
│   ├── drafts/
│   └── 2024-01-15-hello-world.md
├── works/                    # 作品
│   ├── drafts/
│   └── project-name.md
└── assets/
    ├── covers/               # 封面
    └── images/               # 正文截图`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-text-primary mb-2">2. 博客文章格式</h4>
                    <pre className="bg-bg-card rounded-lg text-sm overflow-x-auto border border-border-color"
                    style={{ padding: "12px" }}>
{`---
title:
excerpt:
category:
tags:
cover: assets/covers/image.jpg
date: <% tp.date.now("YYYY-MM-DD") %>
published: false
---`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-text-primary mb-2">3. 作品文章格式</h4>
                    <pre className="bg-bg-card rounded-lg text-sm overflow-x-auto border border-border-color"
                    style={{ padding: "12px" }}>
{`---
title:
description:
cover: assets/covers/project-cover.jpg
category:
demo:
repo:
date: <% tp.date.now("YYYY-MM-DD") %>
published: false
---
#

## 项目简介

项目介绍...

## 技术栈

- 技术1
- 技术2
- 技术3

## 主要功能

- 功能1
- 功能2
- 功能3

## 项目成果

项目成果和数据...`}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium text-text-primary mb-2">4. Webhook 配置</h4>
                    <p className="text-sm">
                      在仓库 Settings → Webhooks → Add webhook 中配置：
                    </p>
                    <ul className="list-disc list-inside text-sm text-text-muted"
                    style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      <li>Payload URL: <code className="bg-bg-secondary rounded"
                      style={{ paddingLeft: "4px", paddingRight: "4px" }}>your-domain.com/api/github/webhook</code></li>
                      <li>Content type: <code className="bg-bg-secondary rounded"
                      style={{ paddingLeft: "4px", paddingRight: "4px" }}>application/json</code></li>
                      <li>Secret: 设置一个密钥并添加到环境变量 <code className="bg-bg-secondary rounded"
                      style={{ paddingLeft: "4px", paddingRight: "4px" }}>GITHUB_WEBHOOK_SECRET</code></li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
