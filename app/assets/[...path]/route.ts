import { readFile } from "fs/promises";
import path from "path";

// 项目根的 assets/ 不在 public/ 下，Next 不会自动托管；
// 这里用 catch-all 路由把它们以 /assets/... 暴露出去（图片 + 未来其它附件）。

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segs } = await params;
  const root = path.join(process.cwd(), "assets");
  const rel = path.normalize(segs.join("/"));
  const full = path.join(root, rel);

  // 防目录穿越：规范化后必须仍位于 assets/ 内
  if (rel.startsWith("..") || path.relative(root, full).startsWith("..")) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const buf = await readFile(full);
    const ext = path.extname(full).toLowerCase();
    return new Response(buf, {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
