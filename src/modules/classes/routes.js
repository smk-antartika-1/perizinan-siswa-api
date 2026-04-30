import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { listStudentsByClass } from "./controller.js";

const router = Router();
router.get("/students", requireAuth, requireRoles("wali_kelas", "guru_piket", "admin"), listStudentsByClass);

export default router;
