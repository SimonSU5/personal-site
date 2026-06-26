import { checkAuth } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import path from "path";

async function getPosts() {
  const filePath = path.join(process.cwd(), "data", "posts.json");
  const file = await readFile(filePath, "utf-8");
  return JSON.parse(file);
}

async function savePosts(posts: any[]) {
  const filePath = path.join(process.cwd(), "data", "posts.json");
  await writeFile(filePath, JSON.stringify(posts, null, 2));
}

export async function GET() {
  try {
    const posts = await getPosts();
    return Response.json(posts);
  } catch (error) {
    return Response.json({ error: "Failed to read posts" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const posts = await getPosts();

    const newPost = {
      id: String(Date.now()),
      ...body,
    };

    posts.push(newPost);
    await savePosts(posts);

    return Response.json(newPost);
  } catch (error) {
    return Response.json({ error: "Failed to save post" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({ error: "Missing id" }, { status: 400 });
    }

    const posts = await getPosts();
    const filtered = posts.filter((p: any) => p.id !== id);

    await savePosts(filtered);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
