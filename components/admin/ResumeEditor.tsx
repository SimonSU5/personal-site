"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";

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

interface ResumeEditorProps {
  education?: Education[];
  experience?: Experience[];
  skills?: Skill[];
  onUpdate?: (data: { education?: Education[]; experience?: Experience[]; skills?: Skill[] }) => void;
}

export default function ResumeEditor({
  education = [],
  experience = [],
  skills = [],
  onUpdate,
}: ResumeEditorProps) {
  const [educations, setEducations] = useState<Education[]>([]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [skillList, setSkillList] = useState<Skill[]>([]);

  // 当 props 变化时同步更新 state
  useEffect(() => {
    if (education && education.length > 0) {
      setEducations(education);
    } else {
      setEducations([{ id: "1", title: "", period: "", description: "" }]);
    }
  }, [education]);

  useEffect(() => {
    if (experience && experience.length > 0) {
      setExperiences(experience);
    } else {
      setExperiences([{ id: "1", title: "", period: "", description: "" }]);
    }
  }, [experience]);

  useEffect(() => {
    if (skills && skills.length > 0) {
      setSkillList(skills);
    } else {
      setSkillList([{ id: "1", name: "", percentage: 50 }]);
    }
  }, [skills]);

  const [activeTab, setActiveTab] = useState<"education" | "experience" | "skills">("education");
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleAddEducation = () => {
    const newEdu: Education = {
      id: Date.now().toString(),
      title: "",
      period: "",
      description: "",
    };
    const updated = [...educations, newEdu];
    setEducations(updated);
    setEditingId(newEdu.id);
    notifyUpdate({ education: updated });
  };

  const handleUpdateEducation = (id: string, field: keyof Education, value: string) => {
    const updated = educations.map((edu) =>
      edu.id === id ? { ...edu, [field]: value } : edu
    );
    setEducations(updated);
    notifyUpdate({ education: updated });
  };

  const handleDeleteEducation = (id: string) => {
    const updated = educations.filter((edu) => edu.id !== id);
    setEducations(updated.length > 0 ? updated : [{ id: Date.now().toString(), title: "", period: "", description: "" }]);
    notifyUpdate({ education: updated.length > 0 ? updated : [{ id: Date.now().toString(), title: "", period: "", description: "" }] });
  };

  const handleAddExperience = () => {
    const newExp: Experience = {
      id: Date.now().toString(),
      title: "",
      period: "",
      description: "",
    };
    const updated = [...experiences, newExp];
    setExperiences(updated);
    setEditingId(newExp.id);
    notifyUpdate({ experience: updated });
  };

  const handleUpdateExperience = (id: string, field: keyof Experience, value: string) => {
    const updated = experiences.map((exp) =>
      exp.id === id ? { ...exp, [field]: value } : exp
    );
    setExperiences(updated);
    notifyUpdate({ experience: updated });
  };

  const handleDeleteExperience = (id: string) => {
    const updated = experiences.filter((exp) => exp.id !== id);
    setExperiences(updated.length > 0 ? updated : [{ id: Date.now().toString(), title: "", period: "", description: "" }]);
    notifyUpdate({ experience: updated.length > 0 ? updated : [{ id: Date.now().toString(), title: "", period: "", description: "" }] });
  };

  const handleAddSkill = () => {
    const newSkill: Skill = {
      id: Date.now().toString(),
      name: "",
      percentage: 50,
    };
    const updated = [...skillList, newSkill];
    setSkillList(updated);
    notifyUpdate({ skills: updated });
  };

  const handleUpdateSkill = (id: string, field: keyof Skill, value: string | number) => {
    const updated = skillList.map((skill) =>
      skill.id === id ? { ...skill, [field]: value } : skill
    );
    setSkillList(updated);
    notifyUpdate({ skills: updated });
  };

  const handleDeleteSkill = (id: string) => {
    const updated = skillList.filter((skill) => skill.id !== id);
    setSkillList(updated.length > 0 ? updated : [{ id: Date.now().toString(), name: "", percentage: 50 }]);
    notifyUpdate({ skills: updated.length > 0 ? updated : [{ id: Date.now().toString(), name: "", percentage: 50 }] });
  };

  const notifyUpdate = (data: { education?: Education[]; experience?: Experience[]; skills?: Skill[] }) => {
    if (onUpdate) {
      onUpdate(data);
    }
  };

  return (
    <div className="resume-editor">
      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "education" ? "active" : ""}`}
          onClick={() => setActiveTab("education")}
        >
          教育背景
        </button>
        <button
          className={`admin-tab ${activeTab === "experience" ? "active" : ""}`}
          onClick={() => setActiveTab("experience")}
        >
          工作经历
        </button>
        <button
          className={`admin-tab ${activeTab === "skills" ? "active" : ""}`}
          onClick={() => setActiveTab("skills")}
        >
          技能专长
        </button>
      </div>

      <div className="admin-tab-content">
        {/* Education Tab */}
        {activeTab === "education" && (
          <div className="admin-list">
            {educations.map((edu, index) => (
              <div
                key={edu.id}
                className="admin-list-item"
                onMouseEnter={() => setEditingId(edu.id)}
                onMouseLeave={() => setEditingId(null)}
              >
                <div className="admin-list-item-drag">
                  <GripVertical size={16} className="text-text-muted" />
                </div>
                <div className="admin-list-item-content flex-1" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="text"
                    value={edu.title}
                    onChange={(e) => handleUpdateEducation(edu.id, "title", e.target.value)}
                    placeholder="学历/学位"
                    className="admin-input w-full"
                  />
                  <input
                    type="text"
                    value={edu.period}
                    onChange={(e) => handleUpdateEducation(edu.id, "period", e.target.value)}
                    placeholder="时间段 (如: 2016 — 2020)"
                    className="admin-input w-full"
                  />
                  <textarea
                    value={edu.description}
                    onChange={(e) => handleUpdateEducation(edu.id, "description", e.target.value)}
                    placeholder="描述"
                    className="admin-input w-full min-h-[80px] resize-y"
                    rows={3}
                  />
                </div>
                {educations.length > 1 && (
                  <button
                    className="admin-list-item-delete"
                    onClick={() => handleDeleteEducation(edu.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button className="admin-btn admin-btn-secondary w-full" onClick={handleAddEducation}>
              <Plus size={16} className="mr-2" />
              添加教育经历
            </button>
          </div>
        )}

        {/* Experience Tab */}
        {activeTab === "experience" && (
          <div className="admin-list">
            {experiences.map((exp) => (
              <div
                key={exp.id}
                className="admin-list-item"
                onMouseEnter={() => setEditingId(exp.id)}
                onMouseLeave={() => setEditingId(null)}
              >
                <div className="admin-list-item-drag">
                  <GripVertical size={16} className="text-text-muted" />
                </div>
                <div className="admin-list-item-content flex-1" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="text"
                    value={exp.title}
                    onChange={(e) => handleUpdateExperience(exp.id, "title", e.target.value)}
                    placeholder="职位/角色"
                    className="admin-input w-full"
                  />
                  <input
                    type="text"
                    value={exp.period}
                    onChange={(e) => handleUpdateExperience(exp.id, "period", e.target.value)}
                    placeholder="时间段 (如: 2020 — 至今)"
                    className="admin-input w-full"
                  />
                  <textarea
                    value={exp.description}
                    onChange={(e) => handleUpdateExperience(exp.id, "description", e.target.value)}
                    placeholder="工作描述"
                    className="admin-input w-full min-h-[80px] resize-y"
                    rows={3}
                  />
                </div>
                {experiences.length > 1 && (
                  <button
                    className="admin-list-item-delete"
                    onClick={() => handleDeleteExperience(exp.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button className="admin-btn admin-btn-secondary w-full" onClick={handleAddExperience}>
              <Plus size={16} className="mr-2" />
              添加工作经历
            </button>
          </div>
        )}

        {/* Skills Tab */}
        {activeTab === "skills" && (
          <div className="admin-list">
            {skillList.map((skill) => (
              <div
                key={skill.id}
                className="admin-list-item"
                onMouseEnter={() => setEditingId(skill.id)}
                onMouseLeave={() => setEditingId(null)}
              >
                <div className="admin-list-item-drag">
                  <GripVertical size={16} className="text-text-muted" />
                </div>
                <div className="admin-list-item-content flex-1" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    type="text"
                    value={skill.name}
                    onChange={(e) => handleUpdateSkill(skill.id, "name", e.target.value)}
                    placeholder="技能名称"
                    className="admin-input w-full"
                  />
                  <div className="skill-progress-wrapper">
                    <div className="flex justify-between text-sm text-text-secondary" style={{ marginBottom: "8px" }}>
                      <span>熟练度</span>
                      <span>{skill.percentage}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={skill.percentage}
                      onChange={(e) => handleUpdateSkill(skill.id, "percentage", parseInt(e.target.value))}
                      className="skill-progress-slider w-full"
                    />
                    <div className="skill-progress-bar">
                      <div
                        className="skill-progress-fill"
                        style={{ width: `${skill.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
                {skillList.length > 1 && (
                  <button
                    className="admin-list-item-delete"
                    onClick={() => handleDeleteSkill(skill.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button className="admin-btn admin-btn-secondary w-full" onClick={handleAddSkill}>
              <Plus size={16} className="mr-2" />
              添加技能
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
