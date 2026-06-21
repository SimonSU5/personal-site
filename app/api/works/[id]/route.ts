import { cookies } from "next/headers";
import { readFile, writeFile } from "fs/promises";
import path from "path";

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin-session");
  return session?.value === "true";
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
    const filePath = path.join(process.cwd(), "data", "works.json");
    const file = await readFile(filePath, "utf-8");
    const works = JSON.parse(file);

    const filtered = works.filter((w: any) => w.id !== id);

    await writeFile(filePath, JSON.stringify(filtered, null, 2));

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete work" }, { status: 500 });
  }
}
