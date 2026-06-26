import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-edge";

// 保护所有 admin 路由
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 只检查 /admin 路由
  if (path.startsWith("/admin")) {
    // 登录页面不需要认证
    if (path === "/admin/login") {
      return NextResponse.next();
    }

    // 从 cookie 中获取 session
    const session = request.cookies.get("admin-session")?.value;

    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // 验证 session 签名
    const isValid = await verifyToken(session);
    if (!isValid) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}
