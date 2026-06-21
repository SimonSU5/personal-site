"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();
  const [works, setWorks] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/auth/check");
      if (!res.ok) {
        router.push("/admin/login");
      }
    } catch {
      router.push("/admin/login");
    }
  };

  const fetchData = async () => {
    try {
      const [worksRes, postsRes] = await Promise.all([
        fetch("/api/works"),
        fetch("/api/posts"),
      ]);
      if (worksRes.ok) setWorks(await worksRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWork = async (id: string) => {
    if (!confirm("确定要删除这个作品吗？")) return;
    try {
      const res = await fetch(`/api/works/${id}`, { method: "DELETE" });
      if (res.ok) setWorks(works.filter((w) => w.id !== id));
    } catch {
      alert("删除失败");
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!confirm("确定要删除这篇文章吗？")) return;
    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) setPosts(posts.filter((p) => p.id !== id));
    } catch {
      alert("删除失败");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/admin/upload"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              上传作品
            </Link>
            <Link
              href="/admin/upload-post"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              发布博客
            </Link>
            <Link
              href="/admin/github-settings"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              GitHub 设置
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              退出
            </button>
            <a href="/" className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">
              查看网站
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-gray-500 text-sm mb-2">作品总数</h3>
            <p className="text-3xl font-bold text-gray-900">{works.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-gray-500 text-sm mb-2">博客文章</h3>
            <p className="text-3xl font-bold text-gray-900">{posts.length}</p>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h3 className="text-gray-500 text-sm mb-2">留言</h3>
            <p className="text-3xl font-bold text-gray-900">0</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Link
              href="/admin/upload"
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <span className="text-2xl">📤</span>
              <span className="text-sm text-gray-700">上传作品</span>
            </Link>
            <Link
              href="/admin/upload-post"
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-colors"
            >
              <span className="text-2xl">✍️</span>
              <span className="text-sm text-gray-700">发布博客</span>
            </Link>
            <Link
              href="/admin/edit-about"
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-colors"
            >
              <span className="text-2xl">👤</span>
              <span className="text-sm text-gray-700">编辑关于</span>
            </Link>
            <Link
              href="/admin/edit-content"
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-amber-500 hover:bg-amber-50 transition-colors"
            >
              <span className="text-2xl">📝</span>
              <span className="text-sm text-gray-700">编辑内容</span>
            </Link>
            <Link
              href="/admin/github-settings"
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-cyan-500 hover:bg-cyan-50 transition-colors"
            >
              <span className="text-2xl">🐙</span>
              <span className="text-sm text-gray-700">GitHub 同步</span>
            </Link>
          </div>
        </div>

        {/* Works List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">作品列表</h2>
            <Link
              href="/admin/upload"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              + 上传作品
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-500">加载中...</p>
          ) : works.length === 0 ? (
            <p className="text-gray-500">暂无作品</p>
          ) : (
            <div className="space-y-4">
              {works.map((work) => (
                <div
                  key={work.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {work.image && (
                      <img
                        src={work.image}
                        alt={work.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{work.title}</h3>
                      <p className="text-sm text-gray-500">{work.category}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteWork(work.id)}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Posts List */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">博客文章</h2>
            <Link
              href="/admin/upload-post"
              className="text-sm text-green-600 hover:text-green-700"
            >
              + 发布文章
            </Link>
          </div>
          {loading ? (
            <p className="text-gray-500">加载中...</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-500">暂无文章</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{post.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">{post.category}</span>
                      <span className="text-sm text-gray-400">{post.date}</span>
                      <span className="text-sm text-gray-400">{post.readTime}阅读</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{post.excerpt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeletePost(post.id)}
                      className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
