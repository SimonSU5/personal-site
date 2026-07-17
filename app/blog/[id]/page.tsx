import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import MarkdownContent from "@/components/MarkdownContent";
import { type ObsidianNote } from "@/lib/remark-obsidian";

interface BlogPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BlogDetailPage({ params }: BlogPageProps) {
  const { id } = await params;
  // Next.js 16 传递的是 URL 编码的 id，需要解码
  const decodedId = decodeURIComponent(id);

  const postsFile = path.join(process.cwd(), "data", "posts.json");
  const postsData = await readFile(postsFile, "utf-8");
  const posts = JSON.parse(postsData);

  const post = posts.find((p: any) => p.id === decodedId);

  if (!post) {
    notFound();
  }

  // 读取 works.json 以解析 Obsidian 内部链接（博客可能链接到作品）
  let works: any[] = [];
  try {
    const worksFile = path.join(process.cwd(), "data", "works.json");
    works = JSON.parse(await readFile(worksFile, "utf-8"));
  } catch {
    works = [];
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

        <h1 className="text-4xl font-bold text-text-primary mb-4">{post.title}</h1>
        <p className="text-text-secondary mb-8">{post.date} · {post.category} · {post.readTime}阅读</p>

        {post.cover && (
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-auto rounded-lg mb-8 max-h-[600px]"
          />
        )}

        <div className="prose prose-invert prose-lg max-w-none detail-markdown">
          {post.excerpt && (
            <p className="text-xl text-text-secondary mb-8 leading-relaxed">{post.excerpt}</p>
          )}
          <MarkdownContent content={post.content} notes={notes} />
        </div>
      </div>
    </div>
  );
}
