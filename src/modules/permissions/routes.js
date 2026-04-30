import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { upload } from "../files/upload.js";
import {
  approveByPiket,
  approveByWali,
  createPermission,
  generateQr,
  getPermissionById,
  historyGroupedByClass,
  listPermissions,
  rejectPermission,
  uploadDocument,
} from "./controller.js";
import { actionSchema, createPermissionSchema } from "./schemas.js";

const router = Router();
router.use(requireAuth);

router.post("/", requireRoles("siswa"), validate(createPermissionSchema), createPermission);
router.get("/", listPermissions);
router.get("/history/grouped-by-class", requireRoles("wali_kelas", "guru_piket", "admin"), historyGroupedByClass);
router.get("/:id", getPermissionById);
router.patch("/:id/wali-approve", requireRoles("wali_kelas", "admin"), validate(actionSchema), approveByWali);
router.patch("/:id/piket-approve", requireRoles("guru_piket", "admin"), validate(actionSchema), approveByPiket);
router.patch("/:id/reject", requireRoles("wali_kelas", "guru_piket", "admin"), validate(actionSchema), rejectPermission);
router.post("/:id/document", requireRoles("guru_piket", "admin"), upload.single("document"), uploadDocument);
router.post("/:id/qr", requireRoles("guru_piket", "admin"), generateQr);

export default router;
