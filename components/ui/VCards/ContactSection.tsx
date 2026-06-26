"use client";

import { Mail, Send } from "lucide-react";

interface ContactSectionProps {
  email?: string;
  github?: string;
  isActive?: boolean;
}

export default function ContactSection({ email = "", github = "", isActive = false }: ContactSectionProps) {
  return (
    <article className={`contact ${isActive ? "active" : ""}`} data-page="contact">
      <header>
        <h2 className="h2 article-title">联系</h2>
      </header>

      <section className="contact-form">
        <h3 className="h3 form-title">联系表单</h3>

        <form action="#" className="form" data-form>
          <div className="input-wrapper">
            <input
              type="text"
              name="fullname"
              className="form-input"
              placeholder="姓名"
              required
              data-form-input
            />
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="邮箱"
              required
              data-form-input
            />
          </div>

          <textarea
            name="message"
            className="form-input"
            placeholder="你的消息"
            required
            data-form-input
          />

          <button className="form-btn" type="submit" disabled data-form-btn>
            <Send size={18} />
            <span>发送消息</span>
          </button>
        </form>

        <div className="separator" />

        <div className="contact-links">
          {email && (
            <a
              href={`mailto:${email}`}
              className="contact-link"
            >
              <Mail size={18} />
              <span>{email}</span>
            </a>
          )}
          {github && (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-link"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1-.5-4-1.5.5 0 1.5-2.5 0 0 .5 1 1.5 2.5 3 2 5.5 1.5 6 .5.5 0 1 1.5 1.5 3 2 5.5 1.5 6-.5 1-1.5 2-3 2-5.5.08-1.25-.27-2.48-1-3.5 0 0-1-.5-4 1.5-3.5-3.5-6-6-6-6 1.5-1.5 2-2.5 2-3.5V22"/>
              </svg>
              <span>GitHub</span>
            </a>
          )}
        </div>
      </section>
    </article>
  );
}
