import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import {
  listScannedPermissions,
  markNoReturn,
  markReturned,
  reopenPermission,
  scanQr,
} from "./controller.js";

import { readAccessToken } from "../auth/cookies.js";
import { env } from "../../config/env.js";

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
  (req, res, next) => {
    const token = readAccessToken(req);
    if (!token && req.accepts("html")) {
      const frontendUrl = env.corsOrigins[0] || "http://localhost:3000";
      return res.redirect(`${frontendUrl}/scan-qr?token=${req.params.token}`);
    }
    next();
  },
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
