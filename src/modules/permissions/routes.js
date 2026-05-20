import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { upload } from "../files/upload.js";
import {
  addComment,
  approveByPiket,
  approveByWali,
  approveBypassPiket,
  createPermission,
  generateQr,
  getPermissionById,
  getPermissionSurat,
  historyGroupedByClass,
  listPermissions,
  rejectPermission,
  uploadDocument,
} from "./controller.js";
import {
  actionSchema,
  commentSchema,
  createPermissionSchema,
  idParamSchema,
} from "./schemas.js";

const router = Router();

router.get("/:id/surat", validate(idParamSchema), getPermissionSurat);

router.use(requireAuth);

router.post(
  "/",
  requireRoles("siswa"),
  validate(createPermissionSchema),
  createPermission,
);
router.get("/", listPermissions);
router.get(
  "/history/grouped-by-class",
  requireRoles("wali_kelas", "guru_piket", "admin"),
  historyGroupedByClass,
);
router.get("/:id", validate(idParamSchema), getPermissionById);
router.post("/:id/comments", validate(commentSchema), addComment);
router.patch(
  "/:id/wali-approve",
  requireRoles("wali_kelas", "admin"),
  validate(actionSchema),
  approveByWali,
);
router.patch(
  "/:id/piket-approve",
  requireRoles("guru_piket", "admin"),
  validate(actionSchema),
  approveByPiket,
);
router.patch(
  "/:id/bypass-approve",
  requireRoles("guru_piket", "admin"),
  validate(actionSchema),
  approveBypassPiket,
);
router.patch(
  "/:id/reject",
  requireRoles("wali_kelas", "guru_piket", "admin"),
  validate(actionSchema),
  rejectPermission,
);
router.post(
  "/:id/document",
  requireRoles("guru_piket", "admin"),
  upload.single("document"),
  uploadDocument,
);
router.post(
  "/:id/qr",
  requireRoles("guru_piket", "admin"),
  validate(idParamSchema),
  generateQr,
);

export default router;
