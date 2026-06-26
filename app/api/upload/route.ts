import { checkAuth } from "@/lib/auth";
import { writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// 文件魔数
const FILE_MAGIC_NUMBERS: Record<string, string> = {
  "image/jpeg": "ffd8ff",
  "image/png": "89504e47",
  "image/gif": "47494638",
  "image/webp": "52494646",
};

function checkFileMagicNumber(buffer: Buffer, mimeType: string): boolean {
  const expectedMagic = FILE_MAGIC_NUMBERS[mimeType];
  if (!expectedMagic) return true;

  const fileHex = buffer.subarray(0, 4).toString("hex").toLowerCase();
  return fileHex.startsWith(expectedMagic);
}

function sanitizeFilename(filename: string): string {
  const name = filename.replace(/[/\\]/g, "");
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// 使用 sharp 重新处理图片，清除元数据
async function sanitizeImage(buffer: Buffer, mimeType: string): Promise<Buffer> {
  try {
    let image = sharp(buffer);

    // 获取图片元数据验证是否为有效图片
    const metadata = await image.metadata();

    // 限制图片尺寸，防止 DoS
    if (metadata.width && metadata.width > 4096) {
      image = image.resize(4096, null, { withoutEnlargement: true });
    }
    if (metadata.height && metadata.height > 4096) {
      image = image.resize(null, 4096, { withoutEnlargement: true });
    }

    // 转换为目标格式，清除所有元数据
    switch (mimeType) {
      case "image/jpeg":
      case "image/jpg":
        return await image
          .jpeg({ quality: 90, mozjpeg: true })
          .toBuffer();
      case "image/png":
        return await image
          .png({ compressionLevel: 9 })
          .toBuffer();
      case "image/webp":
        return await image
          .webp({ quality: 90 })
          .toBuffer();
      case "image/gif":
        // GIF 保留动画但清除元数据
        return await image
          .gif()
          .toBuffer();
      default:
        return buffer;
    }
  } catch (error) {
    // 如果 sharp 处理失败（不是有效图片），抛出错误
    throw new Error("Invalid image file");
  }
}

export async function POST(request: Request) {
  if (!(await checkAuth())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 验证文件大小
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 验证 MIME 类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        { error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 验证文件魔数（防止双重格式文件）
    if (!checkFileMagicNumber(buffer, file.type)) {
      return Response.json(
        { error: "File content does not match its type" },
        { status: 400 }
      );
    }

    // 使用 sharp 重新处理图片（验证 + 清除元数据）
    const sanitizedBuffer = await sanitizeImage(buffer, file.type);

    const safeName = sanitizeFilename(file.name);
    const filename = `${Date.now()}-${safeName}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    const filepath = path.join(uploadDir, filename);

    await writeFile(filepath, sanitizedBuffer);

    return Response.json({ url: `/uploads/${filename}` });
  } catch (error: any) {
    console.error("Upload error:", error);
    return Response.json(
      { error: error.message || "Upload failed" },
      { status: 500 }
    );
  }
}
