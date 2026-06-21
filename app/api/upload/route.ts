import { cookies } from "next/headers";
import { writeFile } from "fs/promises";
import path from "path";

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin-session");
  return session?.value === "true";
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const filename = `${Date.now()}-${file.name}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, buffer);

    return Response.json({ url: `/uploads/${filename}` });
  } catch (error) {
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
