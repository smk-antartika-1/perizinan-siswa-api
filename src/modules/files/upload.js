import fs from "fs";
import path from "path";
import multer from "multer";
import {
  ensureUploadDirs,
  getUploadRoot,
  sanitizeUploadFilename,
  UPLOAD_SUBDIRS,
} from "../../utils/uploads.js";

ensureUploadDirs();

function createStorage(subdir) {
  const dest = path.join(getUploadRoot(), subdir);
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      cb(null, sanitizeUploadFilename(file.originalname));
    },
  });
}

export const uploadAvatar = multer({
  storage: createStorage(UPLOAD_SUBDIRS.avatars),
});

export const uploadPermissionDocument = multer({
  storage: createStorage(UPLOAD_SUBDIRS.permissions),
});

export const uploadImport = multer({
  storage: createStorage(UPLOAD_SUBDIRS.imports),
});
