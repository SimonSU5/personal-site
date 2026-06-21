import { cookies } from "next/headers";
import { readFile, writeFile } from "fs/promises";
import path from "path";

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin-session");
  return session?.value === "true";
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const filePath = path.join(process.cwd(), "data", "posts.json");
    const file = await readFile(filePath, "utf-8");
    const posts = JSON.parse(file);

    const index = posts.findIndex((p: any) => p.id === id);
    if (index === -1) {
      return Response.json({ error: "Post not found" }, { status: 404 });
    }

    posts[index] = { ...posts[index], ...body };

    await writeFile(filePath, JSON.stringify(posts, null, 2));

    return Response.json(posts[index]);
  } catch (error) {
    return Response.json({ error: "Failed to update post" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const filePath = path.join(process.cwd(), "data", "posts.json");
    const file = await readFile(filePath, "utf-8");
    const posts = JSON.parse(file);

    const filtered = posts.filter((p: any) => p.id !== id);

    await writeFile(filePath, JSON.stringify(filtered, null, 2));

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete post" }, { status: 500 });
  }
}
