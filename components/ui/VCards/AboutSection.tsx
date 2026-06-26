"use client";

import ServiceCard from "./ServiceCard";

interface Service {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface AboutSectionProps {
  greeting?: string;
  title?: string;
  description?: string[];
  services?: Service[];
  isActive?: boolean;
}

export default function AboutSection({
  greeting = "你好",
  title = "我是一名全栈开发者",
  description = [
    "我是一名热爱创造的全栈开发者。我相信好的产品不仅要功能强大，更要让用户感到舒适和愉悦。",
    "在设计时，我注重用户体验和细节打磨。我擅长前端开发、后端架构、UI 设计和产品设计，致力于创造出既有美感又有实用性的数字产品。",
  ],
  services = [],
  isActive = false,
}: AboutSectionProps) {
  return (
    <article className={`about ${isActive ? "active" : ""}`} data-page="about">
      <header>
        <h2 className="h2 article-title">关于我</h2>
      </header>

      <section className="about-text">
        <p>{greeting}，{title}</p>
        {description.map((text, index) => (
          <p key={index}>{text}</p>
        ))}
      </section>

      {services.length > 0 && (
        <section className="service">
          <h3 className="h3 service-title">专业技能</h3>
          <ul className="service-list">
            {services.map((service, index) => (
              <ServiceCard key={index} {...service} />
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
