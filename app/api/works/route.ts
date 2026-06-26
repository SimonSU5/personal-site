import { checkAuth } from "@/lib/auth";
import { readFile, writeFile } from "fs/promises";
import path from "path";

async function getWorks() {
  const filePath = path.join(process.cwd(), "data", "works.json");
  const file = await readFile(filePath, "utf-8");
  return JSON.parse(file);
}

async function saveWorks(works: any[]) {
  const filePath = path.join(process.cwd(), "data", "works.json");
  await writeFile(filePath, JSON.stringify(works, null, 2));
}

export async function GET() {
  try {
    const works = await getWorks();
    return Response.json(works);
  } catch (error) {
    return Response.json({ error: "Failed to read works" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const works = await getWorks();

    const newWork = {
      id: String(Date.now()),
      ...body,
    };

    works.push(newWork);
    await saveWorks(works);

    return Response.json(newWork);
  } catch (error) {
    return Response.json({ error: "Failed to save work" }, { status: 500 });
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

    const works = await getWorks();
    const filtered = works.filter((w: any) => w.id !== id);

    await saveWorks(filtered);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to delete work" }, { status: 500 });
  }
}
