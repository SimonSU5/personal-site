import works from "@/data/works.json";
import WorkCard from "@/components/ui/WorkCard";
import Navbar from "@/components/public/Navbar";

export default function TechPreview() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <Navbar variant="tech" currentPath="/preview/tech" />

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section with Gradient */}
        <section className="mb-20 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 blur-3xl" />
          <h1 className="relative text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            科技风格
          </h1>
          <p className="relative text-xl text-gray-400">Tech Style</p>
          <div className="relative mt-8 w-32 h-px bg-gradient-to-r from-cyan-500 to-purple-500" />
        </section>

        {/* Works Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-8 text-cyan-400">作品集</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} variant="tech" />
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="mt-20 pt-12 border-t border-gray-800">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-400">关于</h2>
          <p className="text-gray-400 leading-relaxed max-w-2xl">
            我是一名全栈开发者，热衷于探索前沿技术。
            专注于构建高性能、可扩展的现代 Web 应用。
          </p>
          {/* Tech Stack */}
          <div className="mt-6 flex flex-wrap gap-2">
            {["React", "Next.js", "TypeScript", "Node.js", "Python", "AWS"].map((tech) => (
              <span key={tech} className="px-3 py-1 text-sm bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Contact Section */}
        <section className="mt-12 pt-12 border-t border-gray-800">
          <h2 className="text-2xl font-semibold mb-4 text-cyan-400">联系方式</h2>
          <div className="flex gap-6 text-gray-400">
            <a href="https://github.com" className="hover:text-cyan-400 transition-colors">GitHub</a>
            <a href="mailto:hello@example.com" className="hover:text-cyan-400 transition-colors">Email</a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 border-t border-gray-800 text-center text-gray-500">
        © 2024 Simon. Powered by Next.js.
      </footer>
    </div>
  );
}
