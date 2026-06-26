"use client";

import { BookOpen, Briefcase } from "lucide-react";
import TimelineItem from "./TimelineItem";
import SkillBar from "./SkillBar";

interface TimelineData {
  title: string;
  period: string;
  description: string;
}

interface Skill {
  name: string;
  percentage: number;
}

interface ResumeSectionProps {
  education?: TimelineData[];
  experience?: TimelineData[];
  skills?: Skill[];
  isActive?: boolean;
}

export default function ResumeSection({
  education = [],
  experience = [],
  skills = [],
  isActive = false,
}: ResumeSectionProps) {
  return (
    <article className={`resume ${isActive ? "active" : ""}`} data-page="resume">
      <header>
        <h2 className="h2 article-title">简历</h2>
      </header>

      {education.length > 0 && (
        <section className="timeline">
          <div className="title-wrapper">
            <div className="icon-box">
              <BookOpen size={24} />
            </div>
            <h3 className="h3">教育</h3>
          </div>
          <ol className="timeline-list">
            {education.map((edu, index) => (
              <TimelineItem key={index} {...edu} />
            ))}
          </ol>
        </section>
      )}

      {experience.length > 0 && (
        <section className="timeline">
          <div className="title-wrapper">
            <div className="icon-box">
              <Briefcase size={24} />
            </div>
            <h3 className="h3">经历</h3>
          </div>
          <ol className="timeline-list">
            {experience.map((exp, index) => (
              <TimelineItem key={index} {...exp} />
            ))}
          </ol>
        </section>
      )}

      {skills.length > 0 && (
        <section className="skill">
          <h3 className="h3 skills-title">我的技能</h3>
          <ul className="skills-list content-card">
            {skills.map((skill, index) => (
              <SkillBar key={index} {...skill} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
