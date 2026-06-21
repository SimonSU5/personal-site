import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";

interface BlogPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function BlogDetailPage({ params }: BlogPageProps) {
  const { id } = await params;

  const postsFile = path.join(process.cwd(), "data", "posts.json");
  const postsData = await readFile(postsFile, "utf-8");
  const posts = JSON.parse(postsData);

  const post = posts.find((p: any) => p.id === id);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
        <p className="text-gray-500 mb-8">{post.date} · {post.category} · {post.readTime}阅读</p>
        <div className="prose max-w-none">
          <p>{post.excerpt}</p>
          <div className="whitespace-pre-wrap mt-6">{post.content}</div>
        </div>
      </div>
    </div>
  );
}
