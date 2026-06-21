"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">编辑关于页面</h1>
          <a href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">
            ← 返回
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-6">
          {/* 简介 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              简介
            </label>
            <textarea
              value={data.intro}
              onChange={(e) => setData({ ...data, intro: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none min-h-[100px]"
            />
          </div>

          {/* 补充信息 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              补充信息
            </label>
            <textarea
              value={data.additional}
              onChange={(e) => setData({ ...data, additional: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 outline-none min-h-[80px]"
            />
          </div>

          {/* 技能 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                技能分类
              </label>
              <button
                type="button"
                onClick={addSkill}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + 添加分类
              </button>
            </div>
            <div className="space-y-3">
              {data.skills.map((skill, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="分类名称"
                    value={skill.category}
                    onChange={(e) => updateSkill(index, "category", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="技能项（用逗号分隔）"
                    value={skill.items.join(", ")}
                    onChange={(e) => updateSkill(index, "items", e.target.value)}
                    className="flex-2 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => removeSkill(index)}
                    className="text-red-600 hover:text-red-700 px-2"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 工作经历 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                工作经历
              </label>
              <button
                type="button"
                onClick={addTimeline}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                + 添加经历
              </button>
            </div>
            <div className="space-y-3">
              {data.timeline.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="年份"
                    value={item.year}
                    onChange={(e) => updateTimeline(index, "year", e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="职位"
                    value={item.title}
                    onChange={(e) => updateTimeline(index, "title", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="公司"
                    value={item.company}
                    onChange={(e) => updateTimeline(index, "company", e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 outline-none"
                  />
                  <button
                    onClick={() => removeTimeline(index)}
                    className="text-red-600 hover:text-red-700 px-2"
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
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存更改"}
          </button>
        </div>
      </main>
    </div>
  );
}
