import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import {
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

router.get("/scan/:token", scanQr);
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
