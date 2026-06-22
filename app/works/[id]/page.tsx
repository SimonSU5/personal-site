import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";
import MarkdownContent from "@/components/MarkdownContent";

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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <a href="/" className="inline-flex items-center gap-2 mb-8 text-[#666666] hover:text-[#333333]">
          ← 返回首页
        </a>

        <h1 className="text-4xl font-bold text-[#1A1A1A] mb-4">{work.title}</h1>

        {work.cover && (
          <img
            src={work.cover}
            alt={work.title}
            className="w-full h-auto rounded-lg mb-8 max-h-[600px]"
          />
        )}

        {work.description && (
          <p className="text-xl mb-8 text-[#666666]">{work.description}</p>
        )}

        {work.tech && work.tech.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2 text-sm text-amber-600">
            {work.tech.map((tag: string, index: number) => (
              <span key={`${tag}-${index}`} className="px-3 py-1 bg-gray-100 rounded">
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
              className="inline-block px-6 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              查看演示
            </a>
          )}
          {work.repo && (
            <a
              href={work.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
            >
              查看代码
            </a>
          )}
        </div>

        {work.content && (
          <div className="prose prose-lg max-w-none">
            <MarkdownContent content={work.content} />
          </div>
        )}
      </div>
    </div>
  );
}
