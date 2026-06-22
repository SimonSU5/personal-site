import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import MarkdownContent from "@/components/MarkdownContent";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 mb-8 text-[#666666] hover:text-[#333333]">
          ← 返回首页
        </a>

        <h1 className="text-4xl font-bold text-[#1A1A1A] mb-4">{post.title}</h1>
        <p className="text-[#666666] mb-8">{post.date} · {post.category} · {post.readTime}阅读</p>

        {post.cover && (
          <img
            src={post.cover}
            alt={post.title}
            className="w-full h-auto rounded-lg mb-8 max-h-[600px]"
          />
        )}

        <div className="prose prose-lg max-w-none">
          {post.excerpt && (
            <p className="text-xl text-[#666666] mb-8 leading-relaxed">{post.excerpt}</p>
          )}
          <MarkdownContent content={post.content} />
        </div>
      </div>
    </div>
  );
}
