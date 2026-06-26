"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

  useEffect(() => {
    fetch("/api/auth/csrf")
      .then((res) => res.json())
      .then((data) => setCsrfToken(data.csrfToken));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": csrfToken,
        },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/admin/dashboard");
      } else {
        const data = await res.json();
        setError(data.error || "登录失败");
      }
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        <aside className="sidebar">
          <div className="sidebar-info">
            <figure className="avatar-box">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 border-2 border-accent-primary flex items-center justify-center">
                <User size={40} className="text-accent-primary" />
              </div>
            </figure>

            <div className="info-content">
              <h1 className="name">管理员</h1>
              <p className="title">后台登录</p>
            </div>
          </div>
        </aside>

        <div className="main-content">
          <article className="login-content active">
            <header>
              <h2 className="h2 article-title">登录</h2>
            </header>

            <section className="login-form-section">
              <form onSubmit={handleSubmit} className="admin-form">
                <div className="form-group">
                  <label className="form-label">管理员密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    className="admin-input"
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-sm mb-4">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !csrfToken}
                  className="admin-btn admin-btn-primary"
                >
                  {loading ? "登录中..." : "登录"}
                </button>
              </form>

              <div className="separator"></div>

              <div className="text-center">
                <a href="/" className="text-text-secondary hover:text-text-primary text-sm">
                  ← 返回首页
                </a>
              </div>
            </section>
          </article>
        </div>
      </main>
    </div>
  );
}
