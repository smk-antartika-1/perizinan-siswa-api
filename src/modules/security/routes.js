import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import {
  markNoReturn,
  markReturned,
  reopenPermission,
  scanQr,
} from "./controller.js";

const router = Router();

router.get("/scan/:token", scanQr);
router.patch(
  "/permissions/:id/return",
  requireAuth,
  requireRoles("guru_piket", "security", "admin"),
  markReturned,
);
router.patch(
  "/permissions/:id/no-return",
  requireAuth,
  requireRoles("guru_piket", "security", "admin"),
  markNoReturn,
);
router.patch(
  "/permissions/:id/reopen",
  requireAuth,
  requireRoles("guru_piket", "security", "admin"),
  reopenPermission,
);

export default router;
