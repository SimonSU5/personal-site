"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">加载中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">GitHub 设置</h1>
          <div className="flex items-center gap-4">
            <a
              href="/admin/dashboard"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              返回后台
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* 配置表单 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">连接 GitHub 仓库</h2>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub 仓库
                <span className="text-gray-400 font-normal ml-2">
                  (格式: username/repo-name)
                </span>
              </label>
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="例如: simon/simon-content"
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              />
            </div>

            {!useEnvToken ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Personal Access Token
                  <span className="text-gray-400 font-normal ml-2">
                    (需要 repo 权限)
                  </span>
                </label>
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                />
                <p className="text-sm text-gray-500 mt-2">
                  在 GitHub Settings → Developer settings → Personal access tokens 中创建
                </p>
              </div>
            ) : (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-green-800">环境变量已配置</span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  正在使用环境变量 GITHUB_TOKEN，无需手动输入
                </p>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存配置"}
            </button>
          </form>
        </div>

        {/* 手动同步 */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">手动同步</h2>
          <p className="text-gray-600 mb-4">
            点击下方按钮从 GitHub 同步博客文章和作品集数据
          </p>

          <button
            onClick={handleSync}
            disabled={syncing || !githubRepo || (!githubToken && !useEnvToken)}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {syncing ? "同步中..." : useEnvToken ? "🔄 立即同步（使用环境变量）" : "🔄 立即同步"}
          </button>

          {useEnvToken && (
            <p className="text-sm text-green-600 mt-2">
              ✓ 已配置环境变量 GITHUB_TOKEN，无需手动输入
            </p>
          )}

          {syncResult && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-green-600 font-medium mb-2">同步成功！</p>
              <p className="text-sm text-gray-600">
                同步了 {syncResult.posts?.length || 0} 篇博客文章
              </p>
              <p className="text-sm text-gray-600">
                同步了 {syncResult.works?.length || 0} 个作品
              </p>
              <p className="text-xs text-gray-400 mt-2">
                时间: {new Date(syncResult.timestamp).toLocaleString("zh-CN")}
              </p>
            </div>
          )}
        </div>

        {/* 使用说明 */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">使用说明</h2>

          <div className="space-y-4 text-gray-600">
            <div>
              <h3 className="font-medium text-gray-900 mb-1">1. 仓库结构</h3>
              <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
{`simon-content/
├── blogs/                    # 博客文章
│   ├── 2024-01-15-hello-world.md
│   └── 2024-02-20-react-hooks.md
├── works.json               # 作品集配置
└── assets/                  # 图片资源`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-1">2. 博客文章格式</h3>
              <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
{`---
title: 你好世界
category: 技术
excerpt: 这是文章摘要
---

这里是文章正文内容...`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-1">3. works.json 格式</h3>
              <pre className="bg-gray-50 p-3 rounded-lg text-sm overflow-x-auto">
{`[
  {
    "id": "work-1",
    "title": "项目名称",
    "description": "项目描述",
    "category": "Web 应用",
    "githubUrl": "https://github.com/user/repo",
    "image": "assets/work-images/screenshot.png",
    "tags": ["React", "TypeScript"]
  }
]`}
              </pre>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-1">4. Webhook 配置</h3>
              <p className="text-sm">
                在仓库 Settings → Webhooks → Add webhook 中配置：
              </p>
              <ul className="list-disc list-inside text-sm mt-2 space-y-1">
                <li>Payload URL: <code className="bg-gray-100 px-1 rounded">your-domain.com/api/github/webhook</code></li>
                <li>Content type: <code className="bg-gray-100 px-1 rounded">application/json</code></li>
                <li>Secret: 设置一个密钥并添加到环境变量 <code className="bg-gray-100 px-1 rounded">GITHUB_WEBHOOK_SECRET</code></li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
