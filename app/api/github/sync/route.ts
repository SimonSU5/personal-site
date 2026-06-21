import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";

async function savePosts(posts: any[]) {
  const filePath = path.join(process.cwd(), "data", "posts.json");
  await writeFile(filePath, JSON.stringify(posts, null, 2));
}

async function saveWorks(works: any[]) {
  const filePath = path.join(process.cwd(), "data", "works.json");
  await writeFile(filePath, JSON.stringify(works, null, 2));
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

    // 同步博客文章
    const posts = await syncPosts(owner, repoName, token);

    // 同步作品集
    const works = await syncWorks(owner, repoName, token);

    // 保存到本地
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
      saved: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("GitHub sync error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function syncPosts(owner: string, repo: string, token: string) {
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
      const frontmatterMatch = content.match(/^---\n(.*?)\n---\n(.*)$/s);
      let title = file.name.replace(".md", "");
      let excerpt = "";
      let category = "未分类";
      let body = content;

      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        body = frontmatterMatch[2];

        const titleMatch = frontmatter.match(/title:\s*(.+)/);
        const excerptMatch = frontmatter.match(/excerpt:\s*(.+)/);
        const categoryMatch = frontmatter.match(/category:\s*(.+)/);

        if (titleMatch) title = titleMatch[1].trim();
        if (excerptMatch) excerpt = excerptMatch[1].trim();
        if (categoryMatch) category = categoryMatch[1].trim();
      }

      // 从文件名提取日期
      const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : new Date().toISOString().split("T")[0];

      // 计算阅读时间
      const wordCount = body.split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));

      posts.push({
        id: file.name.replace(".md", ""),
        title,
        excerpt: excerpt || body.slice(0, 150) + "...",
        content: body,
        category,
        date,
        readTime: `${readTime}分钟`,
        source: "github",
        githubPath: file.path,
      });
    }
  }

  return posts;
}

async function syncWorks(owner: string, repo: string, token: string) {
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
      const frontmatterMatch = content.match(/^---\n(.*?)\n---\n(.*)$/s);
      let title = file.name.replace(".md", "");
      let description = "";
      let cover = "";
      let tech = [];
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

      works.push({
        id: file.name.replace(".md", ""),
        title,
        description,
        cover,
        tech,
        demo,
        repo: repoUrl,
        featured,
        content: body,
        source: "github",
        githubPath: file.path,
      });
    }
  }

  return works;
}
