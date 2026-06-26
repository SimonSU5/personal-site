"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import ResumeEditor from "@/components/admin/ResumeEditor";
import { Save } from "lucide-react";

interface Education {
  id: string;
  title: string;
  period: string;
  description: string;
}

interface Experience {
  id: string;
  title: string;
  period: string;
  description: string;
}

interface Skill {
  id: string;
  name: string;
  percentage: number;
}

export default function ResumePage() {
  const router = useRouter();
  const [education, setEducation] = useState<Education[]>([]);
  const [experience, setExperience] = useState<Experience[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const res = await fetch("/api/content");
      if (res.ok) {
        const data = await res.json();

        // Convert education data
        const eduData = (data.education || []).map((edu: any, index: number) => ({
          id: edu.id || String(index + 1),
          title: edu.title || "",
          period: edu.period || "",
          description: edu.description || "",
        }));

        // Convert experience data
        const expData = (data.experience || []).map((exp: any, index: number) => ({
          id: exp.id || String(index + 1),
          title: exp.title || "",
          period: exp.period || "",
          description: exp.description || "",
        }));

        // Convert skills data
        const skillsData = (data.skills || []).map((skill: any, index: number) => ({
          id: skill.id || String(index + 1),
          name: skill.name || "",
          percentage: skill.percentage || 50,
        }));

        setEducation(eduData.length > 0 ? eduData : [{ id: "1", title: "", period: "", description: "" }]);
        setExperience(expData.length > 0 ? expData : [{ id: "1", title: "", period: "", description: "" }]);
        setSkills(skillsData.length > 0 ? skillsData : [{ id: "1", name: "", percentage: 50 }]);
      }
    } catch (err) {
      console.error("Failed to fetch content");
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage("");

    try {
      const res = await fetch("/api/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          education: education.filter(e => e.title || e.period || e.description),
          experience: experience.filter(e => e.title || e.period || e.description),
          skills: skills.filter(s => s.name),
        }),
      });

      if (res.ok) {
        setSaveMessage("保存成功！");
        setTimeout(() => setSaveMessage(""), 3000);
      } else {
        setSaveMessage("保存失败，请重试");
      }
    } catch (err) {
      setSaveMessage("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout activePage="resume">
      <article className="admin-content active flex flex-col h-full overflow-hidden">
        <header className="article-header article-header-sticky flex-shrink-0 sticky top-0 z-10 bg-bg-card">
          <div className="flex items-center justify-between">
            <h2 className="h2 article-title">简历管理</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="admin-btn admin-btn-primary flex items-center"
              style={{ gap: "8px" }}
            >
              <Save size={16} />
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
          {saveMessage && (
            <p className="text-sm"
            style={{ marginTop: "8px", color: saveMessage.includes("成功") ? "#10b981" : "#ef4444" }}>
              {saveMessage}
            </p>
          )}
        </header>

        <section className="article-content flex-1 overflow-y-auto overflow-x-hidden px-5 pb-5">
          <ResumeEditor
            education={education}
            experience={experience}
            skills={skills}
            onUpdate={(data) => {
              if (data.education) setEducation(data.education);
              if (data.experience) setExperience(data.experience);
              if (data.skills) setSkills(data.skills);
            }}
          />
        </section>
      </article>
    </AdminLayout>
  );
}
