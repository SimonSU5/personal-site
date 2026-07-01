"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import mermaid from "mermaid";

interface MarkdownContentProps {
  content: string;
}

let mermaidInitialized = false;
if (typeof window !== "undefined" && !mermaidInitialized) {
  mermaid.initialize({
    startOnLoad: false,
    theme: "dark",
    securityLevel: "loose",
    themeVariables: {
      dark: {
        primaryColor: "#ffc727",
        primaryTextColor: "#fff",
        primaryBorderColor: "#ffc727",
        lineColor: "#f0f0f0",
        secondaryColor: "#e0e0e0",
        tertiaryColor: "#f0f0f0",
        background: "#1e1e1e",
        mainBkg: "#2a2a2a",
        nodeBorder: "#ffc727",
        clusterBkg: "#2a2a2a",
        clusterBorder: "#ffc727",
        titleColor: "#fff",
        edgeLabelBackground: "#2a2a2a",
        actorBkg: "#2a2a2a",
        actorBorder: "#ffc727",
        actorTextColor: "#fff",
        actorLineColor: "#f0f0f0",
        signalColor: "#f0f0f0",
        signalTextColor: "#fff",
        labelBoxBkgColor: "#2a2a2a",
        labelBoxBorderColor: "#ffc727",
        labelTextColor: "#fff",
        loopTextColor: "#fff",
        noteBorderColor: "#ffc727",
        noteBkgColor: "#2a2a2a",
        noteTextColor: "#fff",
        activationBorderColor: "#ffc727",
        activationBkgColor: "#2a2a2a",
        sequenceNumberColor: "#fff",
      }
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: "basis"
    }
  });
  mermaidInitialized = true;
}

const MermaidBlock = ({ code }: { code: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState(false);

  useEffect(() => {
    const renderDiagram = async () => {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg } = await mermaid.render(id, code);
        setSvg(svg);
        setError(false);
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        setError(true);
      }
    };

    renderDiagram();
  }, [code]);

  if (error) {
    return (
      <div className="p-4 bg-red-900/30 border border-red-500 rounded-lg">
        <p className="text-red-400 text-sm">图表渲染失败，请检查 Mermaid 语法</p>
        <pre className="mt-2 text-xs text-red-300 overflow-x-auto">{code}</pre>
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
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  if (language === "mermaid") {
    return <MermaidBlock code={code} />;
  }

  if (!match) {
    return <code className="px-2 py-1 rounded bg-bg-secondary text-accent-primary text-sm">{children}</code>;
  }

  return (
    <SyntaxHighlighter
      style={oneDark}
      language={language}
      PreTag="div"
      className="rounded-lg !bg-[#1E1E1E]"
      customStyle={{
        margin: "1.5rem 0",
        borderRadius: "0.5rem",
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

export default function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSanitize]}
      components={{
        code: CodeBlock,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
