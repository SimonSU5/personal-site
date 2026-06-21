import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 验证 webhook 签名
    const signature = req.headers.get("x-hub-signature-256");
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.text();
    const hmac = crypto.createHmac("sha256", webhookSecret);
    hmac.update(body);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    if (signature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(body);

    // 检查是否是配置的仓库
    const githubRepo = process.env.GITHUB_REPO;
    if (payload.repository?.full_name !== githubRepo) {
      return NextResponse.json({ error: "Wrong repository" }, { status: 400 });
    }

    // 触发同步
    const changedFiles = payload.commits?.flatMap((commit: any) => [
      ...commit.added,
      ...commit.modified,
      ...commit.removed,
    ]);

    const needsSync = changedFiles?.some((file: string) =>
      file.startsWith("blogs/") || file === "works.json"
    );

    if (needsSync) {
      // 调用内部同步 API
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/github/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          githubToken: process.env.GITHUB_TOKEN,
          githubRepo: process.env.GITHUB_REPO,
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
