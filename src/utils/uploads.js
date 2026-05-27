import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

export const UPLOAD_SUBDIRS = {
  avatars: "avatars",
  permissions: "permissions",
  imports: "imports",
};

export function getUploadRoot() {
  return path.resolve(env.uploadDir);
}

export function ensureUploadDirs() {
  const root = getUploadRoot();
  fs.mkdirSync(root, { recursive: true });
  for (const sub of Object.values(UPLOAD_SUBDIRS)) {
    fs.mkdirSync(path.join(root, sub), { recursive: true });
  }
}

export function sanitizeUploadFilename(originalname) {
  const base = String(originalname || "file")
    .replace(/[/\\]/g, "_")
    .replace(/\s+/g, "_");
  return `${Date.now()}-${base}`;
}

/** Path relatif untuk disimpan di DB, mis. `avatars/1730-foto.jpg` */
export function getStoredUploadPath(subdir, filename) {
  return `${subdir}/${filename}`;
}

export function uploadPublicUrl(storedPath) {
  if (!storedPath) return null;
  if (storedPath.startsWith("http://") || storedPath.startsWith("https://")) {
    return storedPath;
  }
  const normalized = storedPath.replace(/\\/g, "/");
  return `${env.appUrl}/uploads/${normalized}`;
}

export async function removeUploadedFile(storedPath) {
  if (!storedPath) return;
  const root = getUploadRoot();
  const full = path.join(root, storedPath);
  await fs.promises.unlink(full).catch(() => undefined);
  // Legacy: file lama tanpa subfolder
  if (!storedPath.includes("/")) {
    await fs.promises.unlink(path.join(root, storedPath)).catch(() => undefined);
  }
}

export async function removeTempUploadFile(file) {
  if (!file?.path) return;
  await fs.promises.unlink(file.path).catch(() => undefined);
}
