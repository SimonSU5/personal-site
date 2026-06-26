import { checkAuth } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import path from "path";

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
    const filePath = path.join(process.cwd(), "data", "works.json");
    const file = await readFile(filePath, "utf-8");
    const works = JSON.parse(file);

    const index = works.findIndex((w: any) => w.id === id);
    if (index === -1) {
      return Response.json({ error: "Work not found" }, { status: 404 });
    }

    works[index] = { ...works[index], ...body };

    await writeFile(filePath, JSON.stringify(works, null, 2));

    return Response.json({ success: true, work: works[index] });
  } catch (error) {
    return Response.json({ error: "Failed to update work" }, { status: 500 });
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
