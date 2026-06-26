import { createSession } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/csrf";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000;

const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function isLockedOut(identifier: string): boolean {
  const attempts = loginAttempts.get(identifier);
  if (!attempts) return false;

  const timePassed = Date.now() - attempts.lastAttempt;
  if (timePassed > LOCKOUT_TIME) {
    loginAttempts.delete(identifier);
    return false;
  }

  return attempts.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedAttempt(identifier: string): void {
  const attempts = loginAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
  attempts.count += 1;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(identifier, attempts);
}

function clearAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

export async function POST(request: Request) {
  const csrfToken = request.headers.get("X-CSRF-Token");

  // CSRF protection for login
  if (!(await verifyCsrfToken(csrfToken || ""))) {
    return Response.json({ error: "无效的请求" }, { status: 403 });
  }

  const { password } = await request.json();

  const identifier = request.headers.get("x-forwarded-for") || "unknown";

  if (isLockedOut(identifier)) {
    const attempts = loginAttempts.get(identifier);
    const remainingTime = Math.ceil((LOCKOUT_TIME - (Date.now() - (attempts?.lastAttempt || 0))) / 60000);
    return Response.json(
      { error: `登录尝试过多，请 ${remainingTime} 分钟后再试` },
      { status: 429 }
    );
  }

  if (password === ADMIN_PASSWORD) {
    clearAttempts(identifier);
    await createSession();
    return Response.json({ success: true });
  }

  recordFailedAttempt(identifier);
  const attempts = loginAttempts.get(identifier);
  const remaining = MAX_LOGIN_ATTEMPTS - (attempts?.count || 0);

  return Response.json(
    { error: `密码错误，还剩 ${remaining} 次尝试机会` },
    { status: 401 }
  );
}
