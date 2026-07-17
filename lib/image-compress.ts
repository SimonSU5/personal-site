// GitHub 同步时对 assets/ 下的图片做压缩（落盘前）。
//
// 目标：每张图尽量 ≤ MAX_BYTES，统一输出 WebP，让全站图片加载流畅。
// 策略：resize 到最大宽 → webp quality 阶梯降级 → 仍超则逐步缩宽 → 兜底取最后结果。
// 源图（contents 仓库）不变；本地 assets/ 存压缩版（已 gitignore，可经 sync 重生）。
//
// 设计为纯函数（仅依赖 sharp + Buffer），不碰 fs，便于单测。

import sharp from "sharp";

/** 单图压缩后体积上限（字节）。300KB —— 列表/详情均清晰，首屏加载明显变快。一行可调。 */
export const MAX_BYTES = 300 * 1024;
/** 最大宽度（px）。超过则等比缩小；小图不放大（withoutEnlargement）。 */
export const MAX_WIDTH = 1600;
/** 压缩过程中原样保留（不转 WebP）的扩展名：GIF 保动画、SVG 是矢量。 */
export const SKIP_EXTS = new Set([".gif", ".svg"]);
/** 视为「可压缩图片」的扩展名（比渲染层 isImageFilename 更宽，含 HEIC/TIFF）。 */
export const COMPRESSIBLE_EXTS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".bmp",
  ".avif",
  ".heic",
  ".heif",
  ".tiff",
  ".tif",
  // gif 走 SKIP_EXTS 原样保留，但属图片范畴，故纳入可压缩集合（sync 据此区分图片 vs 其它文件）
  ".gif",
]);
/** 超 MAX_BYTES 时依次降级的 WebP quality 阶梯。 */
const QUALITY_STEPS = [82, 74, 66, 58, 50];
/** quality 到下限后仍超，按此宽度阶梯再缩。 */
const WIDTH_STEPS = [1500, 1200, 1000];

export interface CompressResult {
  buffer: Buffer;
  /** 输出扩展名（带点）。压缩成功为 ".webp"；跳过/失败为原扩展名。 */
  outExt: string;
  /** 是否实际发生了压缩（用于统计）。跳过/失败为 false。 */
  compressed: boolean;
}

export function extOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i).toLowerCase() : "";
}

/** 是否为可压缩图片（含 HEIC/TIFF；SVG/GIF 虽属图片但压缩时会原样保留）。 */
export function isCompressibleImage(filename: string): boolean {
  return COMPRESSIBLE_EXTS.has(extOf(filename));
}

async function encodeWebp(buf: Buffer, width: number, quality: number): Promise<Buffer> {
  return sharp(buf)
    .rotate() // 按 EXIF 自动旋转（修手机照片方向）
    .resize({ width, withoutEnlargement: true }) // 超宽缩小，小图不放大
    .webp({ quality })
    .toBuffer();
}

/**
 * 压缩单张图片 buffer。
 * - gif/svg：原样返回（保动画/矢量）。
 * - sharp 不支持的格式：原样返回（catch 兜底，不阻塞同步）。
 * - 兜底：历经所有阶梯仍超 MAX_BYTES 时，返回最后一次（最小）结果。
 */
export async function compressImageBuffer(
  buf: Buffer,
  filename: string
): Promise<CompressResult> {
  const ext = extOf(filename);

  if (SKIP_EXTS.has(ext) || buf.length === 0) {
    return { buffer: buf, outExt: ext, compressed: false };
  }

  let webp: Buffer | null = null;
  try {
    // quality 阶梯：找到 ≤ MAX_BYTES 即停
    for (const q of QUALITY_STEPS) {
      const out = await encodeWebp(buf, MAX_WIDTH, q);
      webp = out;
      if (out.length <= MAX_BYTES) break;
    }
    // 仍超：固定最低 quality，逐步缩宽
    if (webp && webp.length > MAX_BYTES) {
      const minQ = QUALITY_STEPS[QUALITY_STEPS.length - 1];
      for (const w of WIDTH_STEPS) {
        const out = await encodeWebp(buf, w, minQ);
        webp = out;
        if (out.length <= MAX_BYTES) break;
      }
    }
  } catch (err) {
    console.error(`compressImageBuffer: sharp failed for ${filename}:`, err);
    return { buffer: buf, outExt: ext, compressed: false };
  }

  // 兜底比较：webp 没让图变小（小图偶发，如已高度压缩的 PNG 截图）→ 保留原图
  if (!webp || webp.length >= buf.length) {
    return { buffer: buf, outExt: ext, compressed: false };
  }
  return { buffer: webp, outExt: ".webp", compressed: true };
}
