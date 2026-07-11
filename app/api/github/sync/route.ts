import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { isImageFilename, splitObsidianTarget } from "@/lib/remark-obsidian";

// 同步后的资源 URL 前缀。文件落在项目根 assets/，由 app/assets/[...path]/route.ts 提供服务。
const ASSETS_URL_PREFIX = "/assets";

async function savePosts(posts: any[]) {
  const filePath = path.join(process.cwd(), "data", "posts.json");
  await writeFile(filePath, JSON.stringify(posts, null, 2));
}

async function saveWorks(works: any[]) {
  const filePath = path.join(process.cwd(), "data", "works.json");
  await writeFile(filePath, JSON.stringify(works, null, 2));
}

// 把对 assets/ 的引用（cover 或图片名）解析为本地 /assets/<path>。
// 支持 "assets/covers/foo.png"、"images/foo.png"、"foo.png"；bare 文件名会用索引补全子目录。
function resolveAssetRef(ref: string, index: Record<string, string>): string {
  let p = ref.trim().replace(/^\/+/, "");
  if (p.startsWith("assets/")) p = p.slice("assets/".length);
  if (!p.includes("/") && index[p]) p = index[p];
  return encodeURI(`${ASSETS_URL_PREFIX}/${p}`.replace(/\/{2,}/g, "/"));
}

// 同步期把 Obsidian 图片嵌入 ![[file.png]] 改写成标准 markdown，指向本地 /assets/...
// 笔记链接 [[note]] 不在此处理（留给渲染层 remark 插件）。
function rewriteObsidianImages(body: string, index: Record<string, string>): string {
  const re = /!\[\[([^\]\n]+)\]\]/g;
  return body.replace(re, (m, inner: string) => {
    const { name } = splitObsidianTarget(inner);
    if (!name || !isImageFilename(name)) return m; // 非图片嵌入，保留给渲染层
    const url = name.includes("/")
      ? encodeURI(`${ASSETS_URL_PREFIX}/${name}`.replace(/\/{2,}/g, "/"))
      : resolveAssetRef(name, index);
    return `![${name}](${url})`;
  });
}

// 兜底：把标准 markdown 相对图片 ![alt](rel) 归到 /assets/ 下（已是绝对/完整 URL 的保留）
function processImagePaths(content: string): string {
  const imageRegex = /!\[(.*?)\]\(([^)]+?)\)/g;
  return content.replace(imageRegex, (match, alt, imagePath) => {
    const cleanPath = imagePath.split(/\s+/)[0];
    if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) return match;
    if (cleanPath.startsWith("/")) return match; // 绝对路径（如 /assets/...）保留
    let p = cleanPath;
    if (p.startsWith("assets/")) p = p.slice("assets/".length);
    const url = encodeURI(`${ASSETS_URL_PREFIX}/${p}`.replace(/\/{2,}/g, "/"));
    const hasTitle = imagePath.includes('"');
    if (hasTitle) {
      const titleMatch = imagePath.match(/"([^"]+)"/);
      const title = titleMatch ? `"${titleMatch[1]}"` : "";
      return `![${alt}](${url} ${title})`;
    }
    return `![${alt}](${url})`;
  });
}

interface AssetsSyncResult {
  count: number;
  failed: number;
  truncated: boolean;
  // basename → assets/ 下的相对路径，供 cover / ![[file]] 解析子目录
  index: Record<string, string>;
}

// 同步 contents 仓库的 assets/ → 本地项目根 assets/（保留子目录结构），
// 并构建 basename → 相对路径 的索引。用 Git Trees API（recursive）+ Blobs API 取内容，
// 绕开 Contents API 单文件 1MB 限制。
async function syncAssets(
  owner: string,
  repo: string,
  token: string
): Promise<AssetsSyncResult> {
  const rootPrefix = "assets/";
  const localBase = path.join(process.cwd(), "assets");
  await mkdir(localBase, { recursive: true });

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github.v3+json",
  };

  const empty: AssetsSyncResult = { count: 0, failed: 0, truncated: false, index: {} };

  // 1) 递归列出整棵树，筛出 assets/ 下的文件
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/main?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) {
    if (treeRes.status === 404) return empty; // 没有 assets/ 目录
    throw new Error(`GitHub API error (assets tree): ${treeRes.statusText}`);
  }
  const treeData = await treeRes.json();
  const blobs: any[] = (treeData.tree || []).filter(
    (e: any) => e.type === "blob" && typeof e.path === "string" && e.path.startsWith(rootPrefix)
  );

  // 2) 逐个 blob 取内容并落盘；单个失败不影响其余
  const index: Record<string, string> = {};
  let count = 0;
  let failed = 0;
  for (const blob of blobs) {
    try {
      const blobRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/blobs/${blob.sha}`,
        { headers }
      );
      if (!blobRes.ok) {
        failed++;
        continue;
      }
      const blobData = await blobRes.json();
      const buffer = Buffer.from(
        blobData.content || "",
        blobData.encoding === "base64" ? "base64" : "utf-8"
      );

      const relative = blob.path.slice(rootPrefix.length);
      const localPath = path.join(localBase, relative);
      await mkdir(path.dirname(localPath), { recursive: true });
      await writeFile(localPath, buffer);
      count++;
      // basename → 相对路径（同 basename 以先入为准；cover 走全路径不受影响）
      const base = relative.split("/").pop();
      if (base && !index[base]) index[base] = relative;
    } catch (err) {
      console.error(`syncAssets: failed for ${blob.path}:`, err);
      failed++;
    }
  }

  return { count, failed, truncated: !!treeData.truncated, index };
}

export async function POST(req: NextRequest) {
  try {
    const { githubToken, githubRepo } = await req.json();

    // 优先使用环境变量
    const token = githubToken || process.env.GITHUB_TOKEN;
    const repo = githubRepo || process.env.GITHUB_REPO;

    if (!token || !repo) {
      return NextResponse.json({ error: "Missing GitHub credentials" }, { status: 400 });
    }

    const [owner, repoName] = repo.split("/");

    // 先同步 assets 并构建索引（cover / 正文 ![[file]] 解析要用）；
    // 即便 assets 同步抛错也只降级为没有索引，不影响内容同步
    let assetsResult: AssetsSyncResult = { count: 0, failed: 0, truncated: false, index: {} };
    try {
      assetsResult = await syncAssets(owner, repoName, token);
    } catch (e: any) {
      console.error("syncAssets error:", e);
    }

    // 同步博客 / 作品（用 assets 索引解析本地资源路径）
    const posts = await syncPosts(owner, repoName, token, assetsResult.index);
    const works = await syncWorks(owner, repoName, token, assetsResult.index);

    if (posts.length > 0) {
      await savePosts(posts);
    }
    if (works.length > 0) {
      await saveWorks(works);
    }

    return NextResponse.json({
      success: true,
      posts,
      works,
      assetsSynced: assetsResult.count,
      assetsFailed: assetsResult.failed,
      assetsTruncated: assetsResult.truncated,
      saved: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("GitHub sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncPosts(owner: string, repo: string, token: string, index: Record<string, string>) {
  // 获取 blogs 目录下的文件
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/blogs`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      // blogs 目录不存在，返回空数组
      return [];
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const files = await response.json();
  const posts = [];

  for (const file of files) {
    if (file.name.endsWith(".md")) {
      // 获取文件内容
      const contentRes = await fetch(file.url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const contentData = await contentRes.json();
      const content = Buffer.from(contentData.content, "base64").toString("utf-8");

      // 解析 frontmatter
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      let title = file.name.replace(".md", "");
      let excerpt = "";
      let category = "未分类";
      let cover = "";
      let body = content;

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        body = frontmatterMatch[2];

        // 按行解析 frontmatter
        const lines = frontmatter.split("\n");
        for (const line of lines) {
          const colonIndex = line.indexOf(":");
          if (colonIndex === -1) continue;

          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();

          switch (key) {
            case "title":
              title = value;
              break;
            case "excerpt":
              excerpt = value;
              break;
            case "category":
              if (value) category = value;
              break;
            case "tags":
              // tags 字段暂时不处理，如果需要可以添加
              break;
            case "cover":
              cover = value;
              break;
            case "date":
              // 如果 frontmatter 有日期，使用它
              break;
          }
        }
      }

      // 封面解析为本地 /assets/...（用同步下来的 assets）
      if (cover && !cover.startsWith("http")) {
        cover = resolveAssetRef(cover, index);
      }

      // 正文：先改写 Obsidian 图片嵌入 ![[..]]，再兜底处理标准 markdown 相对图片
      const processedBody = processImagePaths(rewriteObsidianImages(body, index));

      // 从文件名提取日期
      const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];

      // 计算阅读时间
      const wordCount = processedBody.split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));

      posts.push({
        id: file.name.replace(".md", ""),
        title,
        excerpt: excerpt || "",
        content: processedBody,
        category,
        date,
        readTime: `${readTime}分钟`,
        cover,
        source: "github",
        githubPath: file.path,
      });
    }
  }

  return posts;
}

async function syncWorks(owner: string, repo: string, token: string, index: Record<string, string>) {
  // 获取 works 目录下的文件
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/works`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      // works 目录不存在
      return [];
    }
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  const files = await response.json();
  const works = [];

  for (const file of files) {
    if (file.name.endsWith(".md")) {
      // 获取文件内容
      const contentRes = await fetch(file.url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      const contentData = await contentRes.json();
      const content = Buffer.from(contentData.content, "base64").toString("utf-8");

      // 解析 frontmatter
      const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
      let title = file.name.replace(".md", "");
      let description = "";
      let category = "未分类";
      let cover = "";
      let tech: string[] = [];
      let demo = "";
      let repoUrl = "";
      let featured = false;
      let body = content;

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        body = frontmatterMatch[2];

        // 按行解析 frontmatter
        const lines = frontmatter.split("\n");
        for (const line of lines) {
          const colonIndex = line.indexOf(":");
          if (colonIndex === -1) continue;

          const key = line.slice(0, colonIndex).trim();
          let value = line.slice(colonIndex + 1).trim();

          switch (key) {
            case "title":
              title = value;
              break;
            case "description":
              description = value;
              break;
            case "category":
              if (value) category = value;
              break;
            case "cover":
              cover = value;
              break;
            case "tech":
              tech = value ? value.split(",").map((t: string) => t.trim()).filter(Boolean) : [];
              break;
            case "demo":
              demo = value;
              break;
            case "repo":
              repoUrl = value;
              break;
            case "featured":
              featured = value.toLowerCase() === "true";
              break;
          }
        }
      }

      // 封面解析为本地 /assets/...（用同步下来的 assets）
      if (cover && !cover.startsWith("http")) {
        cover = resolveAssetRef(cover, index);
      }

      // 正文：先改写 Obsidian 图片嵌入 ![[..]]，再兜底处理标准 markdown 相对图片
      const processedBody = processImagePaths(rewriteObsidianImages(body, index));

      works.push({
        id: file.name.replace(".md", ""),
        title,
        description,
        category,
        cover,
        tech,
        demo,
        repo: repoUrl,
        featured,
        content: processedBody,
        source: "github",
        githubPath: file.path,
      });
    }
  }

  return works;
}
