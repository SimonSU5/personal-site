"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import mermaid from "mermaid";
import { remarkObsidian, type ObsidianNote } from "@/lib/remark-obsidian";
import { useTheme } from "@/lib/contexts/ThemeContext";
import type { ColorMode } from "@/lib/themes";

interface MarkdownContentProps {
  content: string;
  /** 用于解析 Obsidian 内部链接 [[笔记]] 的笔记清单（id/title → /blog|/works/{id}） */
  notes?: ObsidianNote[];
}

// mermaid 配置按当前配色模式构建：dark 用内置 dark 主题，light 用 default，
// 均以当前主题强调色作 primaryColor。sig 守卫，仅模式/强调色变化时才重新 initialize（幂等）。
let lastMermaidSig: string | null = null;
function ensureMermaidInit(mode: ColorMode, accent: string, accentDark: string) {
  const sig = `${mode}|${accent}|${accentDark}`;
  if (lastMermaidSig === sig) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: mode === "light" ? "default" : "dark",
    themeVariables: {
      primaryColor: accent,
      primaryBorderColor: accentDark,
      lineColor: mode === "light" ? accentDark : "#f0f0f0",
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: "basis",
    },
  });
  lastMermaidSig = sig;
}

const MermaidBlock = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);
  const { colorMode, themeRecord } = useTheme();
  const accent = themeRecord.colors.accentPrimary;
  const accentDark = themeRecord.colors.accentDark;

  useEffect(() => {
    // 同 effect 内先按当前模式（重新）init 再 render，保证 render 用到最新配置
    ensureMermaidInit(colorMode, accent, accentDark);
    let cancelled = false;
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(svg);
          setError(false);
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        if (!cancelled) setError(true);
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [code, colorMode, accent, accentDark]);

  if (error) {
    return (
      <div
        className="p-4 rounded-lg"
        style={{
          background: "var(--danger-bg)",
          border: "1px solid var(--danger)",
        }}
      >
        <p style={{ color: "var(--danger)", fontSize: 14 }}>
          图表渲染失败，请检查 Mermaid 语法
        </p>
        <pre
          style={{
            marginTop: 8,
            fontSize: 12,
            color: "var(--danger)",
            opacity: 0.8,
            overflowX: "auto",
          }}
        >
          {code}
        </pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-wrapper my-6"
      style={{
        overflowX: 'auto',
        minWidth: '100%',
      }}
    >
      <div
        ref={containerRef}
        className="mermaid-container flex justify-center"
        style={{ minWidth: 'fit-content' }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
};

const CodeBlock = ({ className, children }: any) => {
  const { colorMode } = useTheme();
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  if (language === "mermaid") {
    return <MermaidBlock code={code} />;
  }

  if (!match) {
    return (
      <code
        style={{
          padding: "2px 6px",
          borderRadius: 4,
          background: "var(--bg-secondary)",
          color: "var(--text-secondary)",
          fontSize: "0.875em",
        }}
      >
        {children}
      </code>
    );
  }

  const hlStyle = colorMode === "light" ? oneLight : oneDark;

  return (
    <SyntaxHighlighter
      style={hlStyle}
      language={language}
      PreTag="div"
      className="rounded-lg"
      customStyle={{
        margin: "1.5rem 0",
        borderRadius: "0.5rem",
        background: "var(--bg-code)",
      }}
      codeTagProps={{
        style: {
          fontFamily: "monospace",
        }
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};

// Obsidian 内部链接渲染：
// - 已匹配的 [[笔记]] → 普通 <a>（指向 /blog|/works/{id}）
// - 未匹配的 → href 以 "#obsidian-unresolved-" 开头，渲染成灰色文本（内联样式，不动 globals.css）
const ObsidianAnchor = ({ href, children, ...rest }: any) => {
  if (typeof href === "string" && href.startsWith("#obsidian-unresolved")) {
    return (
      <span
        title="未解析的内部链接"
        style={{
          color: "var(--text-muted)",
          background: "var(--bg-secondary)",
          padding: "0 0.35em",
          borderRadius: "4px",
          fontSize: "0.9em",
          cursor: "default",
        }}
      >
        {children}
      </span>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
};

export default function MarkdownContent({ content, notes }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[
        remarkGfm,
        [remarkObsidian, { notes, assetsPrefix: "/assets" }],
      ]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        code: CodeBlock,
        a: ObsidianAnchor,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
