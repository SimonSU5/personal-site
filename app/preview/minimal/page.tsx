import works from "@/data/works.json";
import WorkCard from "@/components/ui/WorkCard";
import Navbar from "@/components/public/Navbar";

export default function MinimalPreview() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar variant="minimal" currentPath="/preview/minimal" />

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="mb-20">
          <h1 className="text-6xl font-light tracking-tight mb-4">极简风格</h1>
          <p className="text-xl text-gray-500 font-light">Minimalist Style</p>
          <div className="mt-8 w-16 h-px bg-gray-900" />
        </section>

        {/* Works Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-8">作品集</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} variant="minimal" />
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="mt-20 pt-12 border-t border-gray-200">
          <h2 className="text-2xl font-semibold mb-4">关于</h2>
          <p className="text-gray-600 leading-relaxed max-w-2xl">
            我是一名全栈开发者，专注于构建简洁、高效的 Web 应用。
            相信好的设计应该是看不见的——它让用户专注于内容本身。
          </p>
        </section>

        {/* Contact Section */}
        <section className="mt-12 pt-12 border-t border-gray-200">
          <h2 className="text-2xl font-semibold mb-4">联系方式</h2>
          <div className="flex gap-6 text-gray-600">
            <a href="https://github.com" className="hover:text-gray-900">GitHub</a>
            <a href="mailto:hello@example.com" className="hover:text-gray-900">Email</a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-gray-200 text-center text-gray-500">
        © 2024 Simon. 简约至上。
      </footer>
    </div>
  );
}
