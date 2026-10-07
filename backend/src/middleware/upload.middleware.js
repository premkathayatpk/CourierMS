import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";

// Images are stored on local disk under backend/uploads/<folder>/ and served
// by app.js at /uploads/... The database only stores the relative URL path,
// e.g. "/uploads/avatars/3f2c...e1.jpg".
export const UPLOAD_ROOT = path.resolve(
  process.env.UPLOAD_DIR ||
    path.join(path.dirname(fileURLToPath(import.meta.url)), "../../uploads"),
);

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

// Identify the real file type from its first bytes instead of trusting the
// client-supplied Content-Type / extension.
const detectImageType = (buf) => {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
};

const parseSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
}).single("image");

/**
 * Accepts one multipart field named "image", validates it, writes it to
 * uploads/<folder>/ and sets req.uploadedImage = "/uploads/<folder>/<file>".
 */
export const imageUpload = (folder) => [
  parseSingleImage,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Choose an image to upload." });
      }

      const ext = detectImageType(req.file.buffer);
      if (!ext) {
        return res.status(400).json({ success: false, message: "Only JPG, PNG or WebP images are allowed." });
      }

      const dir = path.join(UPLOAD_ROOT, folder);
      await fs.mkdir(dir, { recursive: true });
      const fileName = `${crypto.randomUUID()}.${ext}`;
      await fs.writeFile(path.join(dir, fileName), req.file.buffer);

      req.uploadedImage = `/uploads/${folder}/${fileName}`;
      next();
    } catch (error) {
      next(error);
    }
  },
];

/** Delete a previously stored image (ignores missing files and paths outside UPLOAD_ROOT). */
export const removeStoredImage = async (urlPath) => {
  if (!urlPath || !urlPath.startsWith("/uploads/")) return;
  const filePath = path.resolve(UPLOAD_ROOT, urlPath.slice("/uploads/".length));
  if (!filePath.startsWith(UPLOAD_ROOT + path.sep)) return; // path traversal guard
  await fs.unlink(filePath).catch(() => {});
};
