import { Work } from "@/types";

interface WorkCardProps {
  work: Work;
  variant?: "tech" | "warm";
}

export default function WorkCard({ work, variant = "warm" }: WorkCardProps) {
  const variants = {
    tech: {
      card: "bg-gray-900 border border-cyan-500/30 hover:border-cyan-400 hover:shadow-cyan-500/20 transition-all overflow-hidden group",
      image: "group-hover:scale-105 transition-transform duration-500",
      title: "text-xl font-semibold text-cyan-400",
      description: "text-gray-400",
      tags: "text-sm text-cyan-300/70",
    },
    warm: {
      card: "bg-white rounded-2xl shadow-md hover:shadow-xl transition-all border border-amber-100",
      image: "rounded-t-2xl",
      title: "text-xl font-semibold text-gray-800",
      description: "text-gray-600",
      tags: "text-sm text-amber-600",
    },
  };

  const style = variants[variant];

  return (
    <div className={`p-4 ${style.card}`}>
      <div className={`w-full aspect-video object-cover ${style.image} mb-4 overflow-hidden bg-gray-200`}>
        {work.image ? (
          <img src={work.image} alt={work.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            暂无图片
          </div>
        )}
      </div>
      <h3 className={style.title}>{work.title}</h3>
      <p className={`mt-2 ${style.description}`}>{work.description}</p>
      <div className={`mt-3 flex flex-wrap gap-2 ${style.tags}`}>
        {work.tags.map((tag) => (
          <span key={tag} className="px-2 py-1 bg-gray-100 rounded">{tag}</span>
        ))}
      </div>
    </div>
  );
}
