// 渲染时把 Obsidian 内部链接转成标准 mdast 节点（保持 posts.json 里的原文不变）。
//
// 支持的语法：
//   ![[image.png]]            → 图片，指向本地 /assets/image.png
//   ![[image.png|别名]]        → 图片，alt 用别名
//   [[笔记]]                  → 链接到 /blog/{id} 或 /works/{id}
//   [[笔记|别名]]             → 链接，显示别名
//   [[笔记#标题]]             → 链接到对应笔记
//   ![[笔记]]                 → 非图片嵌入，退化为指向该笔记的链接
//
// 未匹配的笔记 → href 形如 "#obsidian-unresolved-<name>"（fragment，可过 rehype-sanitize），
// 由 MarkdownContent 的 a 组件渲染成灰色文本。
//
// 这是一个 attacher：remarkObsidian(options) 返回 transformer，配合
// remarkPlugins 里以 [remarkObsidian, options] 形式使用。

export interface ObsidianNote {
  id: string;
  title?: string;
  type: "post" | "work";
}

export interface RemarkObsidianOptions {
  notes?: ObsidianNote[];
  assetsPrefix?: string;
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

// 仅用于判断 text 节点是否需要拆分（非 global，避免 lastIndex 陷阱）
const HAS_WIKI = /\[\[[^\]\n]+\]\]/;

// 拆分用的 global 正则：捕获可选的前导 "!"（嵌入）和内部内容
const WIKI_RE = /(!?)\[\[([^\]\n]+)\]\]/g;

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function buildNotesMap(notes?: ObsidianNote[]): Map<string, ObsidianNote> {
  const map = new Map<string, ObsidianNote>();
  if (!notes) return map;
  const indexNote = (n: ObsidianNote) => {
    if (n.id) map.set(normalize(n.id), n);
    if (n.title) map.set(normalize(n.title), n);
  };
  // 先 works 后 posts → 同名时 posts 覆盖（链接默认指向博客）
  notes.filter((n) => n.type === "work").forEach(indexNote);
  notes.filter((n) => n.type === "post").forEach(indexNote);
  return map;
}

export function remarkObsidian(options: RemarkObsidianOptions = {}) {
  const assetsPrefix = options.assetsPrefix ?? "/assets";
  const notesMap = buildNotesMap(options.notes);

  function parseInner(inner: string) {
    const pipeIdx = inner.indexOf("|");
    const leftRaw = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx);
    const alias = pipeIdx === -1 ? undefined : inner.slice(pipeIdx + 1).trim() || undefined;

    const hashIdx = leftRaw.indexOf("#");
    const name = (hashIdx === -1 ? leftRaw : leftRaw.slice(0, hashIdx)).trim();
    return { name, alias };
  }

  function buildNode(inner: string, isEmbed: boolean) {
    const { name, alias } = parseInner(inner);
    if (!name) return null;

    if (isEmbed && IMAGE_EXT.test(name)) {
      const url = encodeURI(`${assetsPrefix}/${name}`.replace(/\/{2,}/g, "/"));
      return { type: "image", url, alt: alias || name };
    }

    // 笔记链接（含非图片嵌入，退化为链接）
    const display = alias || name;
    const matched = notesMap.get(normalize(name));
    let url: string;
    if (matched) {
      const base = matched.type === "work" ? "/works" : "/blog";
      url = `${base}/${encodeURIComponent(matched.id)}`;
    } else {
      url = `#obsidian-unresolved-${encodeURIComponent(name)}`;
    }
    return {
      type: "link",
      url,
      children: [{ type: "text", value: display }],
    };
  }

  function splitText(value: string): any[] {
    const nodes: any[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    WIKI_RE.lastIndex = 0;
    while ((m = WIKI_RE.exec(value)) !== null) {
      if (m.index > last) {
        nodes.push({ type: "text", value: value.slice(last, m.index) });
      }
      const node = buildNode(m[2], m[1] === "!");
      nodes.push(node ?? { type: "text", value: m[0] });
      last = m.index + m[0].length;
    }
    if (last < value.length) {
      nodes.push({ type: "text", value: value.slice(last) });
    }
    return nodes;
  }

  function walk(node: any) {
    const children = node.children;
    if (!Array.isArray(children)) return;
    const next: any[] = [];
    for (const child of children) {
      if (
        child &&
        child.type === "text" &&
        typeof child.value === "string" &&
        HAS_WIKI.test(child.value)
      ) {
        next.push(...splitText(child.value));
      } else {
        walk(child);
        next.push(child);
      }
    }
    node.children = next;
  }

  return (tree: any) => {
    walk(tree);
  };
}
