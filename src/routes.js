import { Router } from "express";
import authRoutes from "./modules/auth/routes.js";
import profileRoutes from "./modules/profile/routes.js";
import permissionRoutes from "./modules/permissions/routes.js";
import securityRoutes from "./modules/security/routes.js";
import classRoutes from "./modules/classes/routes.js";
import reportRoutes from "./modules/reports/routes.js";
import adminRoutes from "./modules/admin/routes.js";

const router = Router();

router.get("/health", (_req, res) => res.json({ ok: true }));
router.use("/auth", authRoutes);
router.use("/profile", profileRoutes);
router.use("/permissions", permissionRoutes);
router.use("/security", securityRoutes);
router.use("/classes", classRoutes);
router.use("/reports", reportRoutes);
router.use("/admin", adminRoutes);

export default router;
