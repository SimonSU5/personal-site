const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-in-production-min-32-chars";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

interface SessionData {
  authenticated: boolean;
  timestamp: number;
}

// Edge Runtime 专用验证函数（使用 Web Crypto API）
export async function verifyToken(sessionValue: string): Promise<boolean> {
  if (!sessionValue) {
    return false;
  }

  try {
    const parts = sessionValue.split(".");
    if (parts.length !== 2) {
      return false;
    }

    const [sessionStr, signature] = parts;

    // 使用 Web Crypto API（Edge Runtime 支持）
    const encoder = new TextEncoder();
    const keyData = encoder.encode(SESSION_SECRET);
    const messageData = encoder.encode(sessionStr);

    const key = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      messageData
    );

    // 转换为 base64url 格式
    const signatureArray = new Uint8Array(signatureBuffer);
    let expectedSignature = "";
    for (const byte of signatureArray) {
      expectedSignature += String.fromCharCode(byte);
    }
    expectedSignature = btoa(expectedSignature)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

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
