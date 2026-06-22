"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

interface MarkdownContentProps {
  content: string;
}

const CodeBlock = ({ className, children }: any) => {
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "";
  const code = String(children).replace(/\n$/, "");

  if (!match) {
    return <code className="px-2 py-1 rounded bg-gray-100 text-[#E83E8C] text-sm">{children}</code>;
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
      components={{
        code: CodeBlock,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
