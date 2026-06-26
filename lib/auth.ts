import { cookies } from "next/headers";
import crypto from "crypto";

// 使用固定密钥，生产环境必须通过环境变量设置
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production-min-32-chars";
const SECRET = SESSION_SECRET;
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface SessionData {
  authenticated: boolean;
  timestamp: number;
}

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export async function createSession(): Promise<string> {
  // 生产环境密钥检查
  if (process.env.NODE_ENV === "production" && SESSION_SECRET.includes("dev-secret")) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  const token = generateSessionToken();
  const data: SessionData = {
    authenticated: true,
    timestamp: Date.now(),
  };

  const sessionStr = JSON.stringify(data);
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(sessionStr)
    .digest("base64url");

  const sessionValue = `${sessionStr}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set("admin-session", sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return sessionValue;
}

export async function checkAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("admin-session");

  if (!session?.value) {
    return false;
  }

  try {
    const parts = session.value.split(".");
    if (parts.length !== 2) {
      return false;
    }

    const [sessionStr, signature] = parts;

    const expectedSignature = crypto
      .createHmac("sha256", SECRET)
      .update(sessionStr)
      .digest("base64url");

    if (signature !== expectedSignature) {
      return false;
    }

    const data: SessionData = JSON.parse(sessionStr);

    if (!data.authenticated) {
      return false;
    }

    const age = Date.now() - data.timestamp;
    if (age > SESSION_MAX_AGE * 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin-session");
}
