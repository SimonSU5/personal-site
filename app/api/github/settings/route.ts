import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "data", "github-settings.json");

async function ensureSettingsFile() {
  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify({ githubRepo: "", githubToken: "" }, null, 2));
  }
}

export async function GET() {
  await ensureSettingsFile();
  const content = await fs.readFile(SETTINGS_FILE, "utf-8");
  const settings = JSON.parse(content);

  // 不返回 token 的完整值
  return NextResponse.json({
    githubRepo: settings.githubRepo,
    hasToken: !!settings.githubToken,
    tokenPrefix: settings.githubToken ? settings.githubToken.slice(0, 10) + "..." : "",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { githubRepo, githubToken } = await req.json();

    if (!githubRepo || !githubToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await ensureSettingsFile();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify({ githubRepo, githubToken }, null, 2));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
