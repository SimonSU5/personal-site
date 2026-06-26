import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { checkAuth } from "@/lib/auth";

const SETTINGS_FILE = path.join(process.cwd(), "data", "github-settings.json");
const ENCRYPTION_KEY = process.env.GITHUB_ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");
const ALGORITHM = "aes-256-gcm";

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, "hex"), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function decrypt(text: string): string {
  const [ivHex, authTagHex, encrypted] = text.split(":");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, "hex"),
    Buffer.from(ivHex, "hex")
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function ensureSettingsFile() {
  try {
    await fs.access(SETTINGS_FILE);
  } catch {
    await fs.writeFile(SETTINGS_FILE, JSON.stringify({
      githubRepo: "",
      githubToken: ""
    }, null, 2));
  }
}

async function getSettings() {
  await ensureSettingsFile();
  const content = await fs.readFile(SETTINGS_FILE, "utf-8");
  const settings = JSON.parse(content);

  let decryptedToken = "";
  if (settings.githubToken) {
    try {
      decryptedToken = decrypt(settings.githubToken);
    } catch {
      decryptedToken = settings.githubToken;
    }
  }

  return {
    githubRepo: settings.githubRepo || "",
    githubToken: decryptedToken
  };
}

export async function GET() {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await getSettings();
    const hasEnvToken = !!process.env.GITHUB_TOKEN;

    return NextResponse.json({
      githubRepo: settings.githubRepo || process.env.GITHUB_REPO || "",
      hasToken: !!settings.githubToken,
      tokenPrefix: settings.githubToken ? settings.githubToken.slice(0, 10) + "..." : "",
      useEnvToken: hasEnvToken,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!(await checkAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { githubRepo, githubToken } = await req.json();

    if (!githubRepo || !githubToken) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const encryptedToken = encrypt(githubToken);

    await ensureSettingsFile();
    await fs.writeFile(SETTINGS_FILE, JSON.stringify({
      githubRepo,
      githubToken: encryptedToken
    }, null, 2));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
