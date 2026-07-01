"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface SkillGroup {
  category: string;
  items: string[];
}

interface TimelineItem {
  year: string;
  title: string;
  company: string;
}

interface AboutData {
  intro: string;
  additional: string;
  skills: SkillGroup[];
  timeline: TimelineItem[];
}

export default function EditAboutPage() {
  const router = useRouter();
  const [data, setData] = useState<AboutData>({
    intro: "",
    additional: "",
    skills: [],
    timeline: [],
  });
  const [saving, setSaving] = useState(false);

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
      const res = await fetch("/api/about");
      if (res.ok) {
        const jsonData = await res.json();
        setData(jsonData);
      }
    } catch (err) {
      console.error("Failed to fetch about data");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        alert("保存成功！");
      } else {
        alert("保存失败");
      }
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const addSkill = () => {
    setData({
      ...data,
      skills: [...data.skills, { category: "", items: [] }],
    });
  };

  const updateSkill = (index: number, field: keyof SkillGroup, value: any) => {
    const newSkills = [...data.skills];
    if (field === "items") {
      newSkills[index].items = value.split(",").map((s: string) => s.trim()).filter(Boolean);
    } else {
      newSkills[index][field] = value;
    }
    setData({ ...data, skills: newSkills });
  };

  const removeSkill = (index: number) => {
    setData({ ...data, skills: data.skills.filter((_, i) => i !== index) });
  };

  const addTimeline = () => {
    setData({
      ...data,
      timeline: [...data.timeline, { year: "", title: "", company: "" }],
    });
  };

  const updateTimeline = (index: number, field: keyof TimelineItem, value: string) => {
    const newTimeline = [...data.timeline];
    newTimeline[index][field] = value;
    setData({ ...data, timeline: newTimeline });
  };

  const removeTimeline = (index: number) => {
    setData({ ...data, timeline: data.timeline.filter((_, i) => i !== index) });
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <main className="main-container">
        <header className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors"
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
          <h1 className="text-xl font-semibold text-text-primary">编辑关于页面</h1>
          <div style={{ width: "80px" }}></div>
        </header>

        <article className="admin-content active" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* 简介 */}
          <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px" }}>
            <label className="block text-sm font-medium text-text-primary mb-2">
              简介
            </label>
            <textarea
              value={data.intro}
              onChange={(e) => setData({ ...data, intro: e.target.value })}
              className="admin-input w-full min-h-[100px] resize-y"
            />
          </div>

          {/* 补充信息 */}
          <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px" }}>
            <label className="block text-sm font-medium text-text-primary mb-2">
              补充信息
            </label>
            <textarea
              value={data.additional}
              onChange={(e) => setData({ ...data, additional: e.target.value })}
              className="admin-input w-full min-h-[80px] resize-y"
            />
          </div>

          {/* 技能 */}
          <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px" }}>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-text-primary">
                技能分类
              </label>
              <button
                type="button"
                onClick={addSkill}
                className="text-sm text-accent-primary hover:text-accent-secondary"
              >
                + 添加分类
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {data.skills.map((skill, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="分类名称"
                    value={skill.category}
                    onChange={(e) => updateSkill(index, "category", e.target.value)}
                    className="admin-input flex-1"
                  />
                  <input
                    type="text"
                    placeholder="技能项（用逗号分隔）"
                    value={skill.items.join(", ")}
                    onChange={(e) => updateSkill(index, "items", e.target.value)}
                    className="admin-input flex-[2]"
                  />
                  <button
                    onClick={() => removeSkill(index)}
                    className="text-red-500 hover:text-red-600 px-2"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 工作经历 */}
          <div className="bg-bg-card border border-border-color rounded-xl p-6" style={{ width: "100%", maxWidth: "1400px" }}>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-text-primary">
                工作经历
              </label>
              <button
                type="button"
                onClick={addTimeline}
                className="text-sm text-accent-primary hover:text-accent-secondary"
              >
                + 添加经历
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {data.timeline.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="年份"
                    value={item.year}
                    onChange={(e) => updateTimeline(index, "year", e.target.value)}
                    className="admin-input w-24"
                  />
                  <input
                    type="text"
                    placeholder="职位"
                    value={item.title}
                    onChange={(e) => updateTimeline(index, "title", e.target.value)}
                    className="admin-input flex-1"
                  />
                  <input
                    type="text"
                    placeholder="公司"
                    value={item.company}
                    onChange={(e) => updateTimeline(index, "company", e.target.value)}
                    className="admin-input flex-1"
                  />
                  <button
                    onClick={() => removeTimeline(index)}
                    className="text-red-500 hover:text-red-600 px-2"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="admin-btn admin-btn-primary w-full py-3 flex items-center justify-center gap-2"
          >
            {saving ? "保存中..." : "保存更改"}
          </button>
        </article>
      </main>
    </div>
  );
}
