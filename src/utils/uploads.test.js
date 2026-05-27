import test from "node:test";
import assert from "node:assert/strict";
import {
  getStoredUploadPath,
  uploadPublicUrl,
  UPLOAD_SUBDIRS,
} from "./uploads.js";

test("getStoredUploadPath combines subdir and filename", () => {
  assert.equal(
    getStoredUploadPath(UPLOAD_SUBDIRS.avatars, "1730-foto.jpg"),
    "avatars/1730-foto.jpg",
  );
});

test("uploadPublicUrl builds URL with subfolder path", () => {
  const url = uploadPublicUrl("permissions/1730-surat.pdf");
  assert.match(url, /\/uploads\/permissions\/1730-surat\.pdf$/);
});

test("uploadPublicUrl supports legacy flat filename", () => {
  const url = uploadPublicUrl("1730-foto.jpg");
  assert.match(url, /\/uploads\/1730-foto\.jpg$/);
});
