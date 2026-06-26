import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString("hex");
const CSRF_TOKEN_NAME = "csrf-token";
const CSRF_COOKIE_NAME = "csrf-session";

// 生产环境检查
if (process.env.NODE_ENV === "production" && !process.env.CSRF_SECRET) {
  console.warn("⚠️  WARNING: CSRF_SECRET not set in production. Using fallback.");
}

export async function generateCsrfToken(): Promise<string> {
  const sessionId = crypto.randomBytes(16).toString("hex");
  const timestamp = Date.now();

  const tokenData = `${sessionId}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(tokenData)
    .digest("hex");

  const token = `${tokenData}:${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return token;
}

export async function verifyCsrfToken(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  const parts = token.split(":");
  if (parts.length !== 3) {
    return false;
  }

  const [sessionId, timestamp, signature] = parts;

  const tokenData = `${sessionId}:${timestamp}`;
  const expectedSignature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(tokenData)
    .digest("hex");

  if (signature !== expectedSignature) {
    return false;
  }

  const tokenAge = Date.now() - parseInt(timestamp, 10);
  if (tokenAge > 24 * 60 * 60 * 1000) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(CSRF_COOKIE_NAME);

  if (!sessionCookie || sessionCookie.value !== sessionId) {
    return false;
  }

  return true;
}

export async function getCsrfToken(): Promise<string> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(CSRF_COOKIE_NAME);

  if (!sessionCookie) {
    return generateCsrfToken();
  }

  const timestamp = Date.now();
  const tokenData = `${sessionCookie.value}:${timestamp}`;
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(tokenData)
    .digest("hex");

  return `${tokenData}:${signature}`;
}
