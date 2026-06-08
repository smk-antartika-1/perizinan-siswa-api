import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import {
  listScannedPermissions,
  markNoReturn,
  markReturned,
  reopenPermission,
  scanQr,
} from "./controller.js";

const router = Router();

export const RETURN_MANAGEMENT_ROLES = [
  "guru_piket",
  "security",
  "wali_kelas",
  "admin",
];
export const SCAN_MANAGEMENT_ROLES = ["security", "admin"];

router.get(
  "/scan/:token",
  requireAuth,
  requireRoles(...SCAN_MANAGEMENT_ROLES),
  scanQr,
);
router.get(
  "/scanned-permissions",
  requireAuth,
  requireRoles(...SCAN_MANAGEMENT_ROLES),
  listScannedPermissions,
);
router.patch(
  "/permissions/:id/return",
  requireAuth,
  requireRoles(...RETURN_MANAGEMENT_ROLES),
  markReturned,
);
router.patch(
  "/permissions/:id/no-return",
  requireAuth,
  requireRoles(...RETURN_MANAGEMENT_ROLES),
  markNoReturn,
);
router.patch(
  "/permissions/:id/reopen",
  requireAuth,
  requireRoles(...RETURN_MANAGEMENT_ROLES),
  reopenPermission,
);

export default router;
