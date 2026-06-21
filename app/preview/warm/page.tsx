import works from "@/data/works.json";
import WorkCard from "@/components/ui/WorkCard";
import Navbar from "@/components/public/Navbar";

export default function WarmPreview() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 text-gray-800">
      <Navbar variant="warm" currentPath="/preview/warm" />

      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <section className="mb-20 text-center">
          <div className="inline-block px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm mb-4">
            👋 你好，我是 Simon
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">温暖风格</h1>
          <p className="text-xl text-gray-600">Warm & Friendly Style</p>
          <p className="mt-4 text-gray-500">让技术更有温度</p>
        </section>

        {/* Works Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-2 text-center">我的作品</h2>
          <p className="text-center text-gray-500 mb-8">这里是我的一些项目展示</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {works.map((work) => (
              <WorkCard key={work.id} work={work} variant="warm" />
            ))}
          </div>
        </section>

        {/* About Section */}
        <section className="mt-20 pt-12">
          <div className="bg-white rounded-3xl shadow-lg p-8 md:p-12">
            <h2 className="text-2xl font-semibold mb-4 text-amber-600">关于我</h2>
            <p className="text-gray-600 leading-relaxed max-w-2xl">
              我是一名热爱创造的全栈开发者。我相信好的产品不仅要功能强大，
              更要让用户感到舒适和愉悦。在设计时，我注重用户体验和细节打磨。
            </p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              {["前端开发", "后端架构", "UI 设计", "产品设计"].map((skill) => (
                <div key={skill} className="text-center p-4 bg-amber-50 rounded-xl">
                  <div className="text-amber-600 font-medium">{skill}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mt-12 pt-12 text-center">
          <h2 className="text-2xl font-semibold mb-4">联系我</h2>
          <p className="text-gray-500 mb-6">欢迎与我交流，分享想法或合作机会</p>
          <div className="flex justify-center gap-4">
            <a href="https://github.com" className="px-6 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors">
              GitHub
            </a>
            <a href="mailto:hello@example.com" className="px-6 py-3 bg-white text-amber-600 border border-amber-200 rounded-xl hover:bg-amber-50 transition-colors">
              发邮件
            </a>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 text-center text-gray-500">
        <p>© 2024 Simon. 用 ❤️ 构建</p>
      </footer>
    </div>
  );
}
