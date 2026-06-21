import { cookies } from "next/headers";
import { readFile, writeFile } from "fs/promises";
import path from "path";

async function checkAuth() {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin-session");
  return session?.value === "true";
}

async function getAbout() {
  const filePath = path.join(process.cwd(), "data", "about.json");
  const file = await readFile(filePath, "utf-8");
  return JSON.parse(file);
}

async function saveAbout(data: any) {
  const filePath = path.join(process.cwd(), "data", "about.json");
  await writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function GET() {
  try {
    const data = await getAbout();
    return Response.json(data);
  } catch (error) {
    return Response.json({ error: "Failed to read about data" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    await saveAbout(data);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: "Failed to save about data" }, { status: 500 });
  }
}
