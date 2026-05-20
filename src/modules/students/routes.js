import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { getStudentByNis } from "./controller.js";

const router = Router();

router.get("/:nis", requireAuth, requireRoles("wali_kelas", "guru_piket", "security", "admin"), getStudentByNis);

export default router;
