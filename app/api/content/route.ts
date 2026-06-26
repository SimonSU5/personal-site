import { checkAuth } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import path from "path";

async function getContent() {
  const filePath = path.join(process.cwd(), "data", "content.json");
  const file = await readFile(filePath, "utf-8");
  return JSON.parse(file);
}

async function saveContent(data: any) {
  const filePath = path.join(process.cwd(), "data", "content.json");

  const existingContent = await getContent();
  const mergedContent = { ...existingContent, ...data };

  await writeFile(filePath, JSON.stringify(mergedContent, null, 2));
}

export async function GET() {
  try {
    const data = await getContent();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: "Failed to read content data" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    await saveContent(data);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to save content data" }, { status: 500 });
  }
}
