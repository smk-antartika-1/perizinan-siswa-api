import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { entryExitReport, exportEntryExitXlsx } from "./controller.js";

const router = Router();

router.get("/entry-exit", requireAuth, requireRoles("guru_piket", "security", "admin"), entryExitReport);
router.get("/entry-exit/export.xlsx", requireAuth, requireRoles("guru_piket", "admin"), exportEntryExitXlsx);

export default router;
