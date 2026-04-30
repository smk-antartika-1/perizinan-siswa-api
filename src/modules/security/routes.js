import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { markNoReturn, markReturned, scanQr } from "./controller.js";

const router = Router();

router.get("/scan/:token", scanQr);
router.patch("/permissions/:id/return", requireAuth, requireRoles("security", "admin"), markReturned);
router.patch("/permissions/:id/no-return", requireAuth, requireRoles("security", "admin"), markNoReturn);

export default router;
