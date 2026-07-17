import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import MarkdownContent from "@/components/MarkdownContent";
import { type ObsidianNote } from "@/lib/remark-obsidian";

interface WorkPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WorkDetailPage({ params }: WorkPageProps) {
  const { id } = await params;
  // Next.js 16 传递的是 URL 编码的 id，需要解码
  const decodedId = decodeURIComponent(id);

  const worksFile = path.join(process.cwd(), "data", "works.json");
  const worksData = await readFile(worksFile, "utf-8");
  const works = JSON.parse(worksData);

  const work = works.find((w: any) => w.id === decodedId);

  if (!work) {
    notFound();
  }

  // 读取 posts.json 以解析 Obsidian 内部链接（作品可能链接到博客）
  let posts: any[] = [];
  try {
    const postsFile = path.join(process.cwd(), "data", "posts.json");
    posts = JSON.parse(await readFile(postsFile, "utf-8"));
  } catch {
    posts = [];
  }

  const notes: ObsidianNote[] = [
    ...posts.map((p: any) => ({ id: String(p.id), title: p.title, type: "post" as const })),
    ...works.map((w: any) => ({ id: String(w.id), title: w.title, type: "work" as const })),
  ];

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 mb-8 text-text-secondary hover:text-text-primary transition-colors">
          ← 返回首页
        </a>

        <h1 className="text-4xl font-bold text-text-primary mb-4">{work.title}</h1>

        {work.cover && (
          <img
            src={work.cover}
            alt={work.title}
            className="w-full h-auto rounded-lg mb-8 max-h-[600px]"
          />
        )}

        {work.description && (
          <p className="text-xl mb-8 text-text-secondary">{work.description}</p>
        )}

        {work.tech && work.tech.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 text-sm">
            {work.tech.map((tag: string, index: number) => (
              <span key={`${tag}-${index}`} className="px-3 py-1 bg-bg-card border border-border-color text-text-primary rounded">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-4 mb-8">
          {work.demo && (
            <a
              href={work.demo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-accent-primary text-text-inverse rounded-lg hover:opacity-90 transition-opacity"
            >
              查看演示
            </a>
          )}
          {work.repo && (
            <a
              href={work.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-bg-card border border-border-color text-text-primary rounded-lg hover:bg-bg-secondary transition-colors"
            >
              查看代码
            </a>
          )}
        </div>

        {work.content && (
          <div className="prose prose-invert prose-lg max-w-none detail-markdown">
            <MarkdownContent content={work.content} notes={notes} />
          </div>
        )}
      </div>
    </div>
  );
}
