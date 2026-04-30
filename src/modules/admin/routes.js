import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { upload } from "../files/upload.js";
import { importStudents } from "./controller.js";

const router = Router();

router.post("/students/import.xlsx", requireAuth, requireRoles("admin"), upload.single("file"), importStudents);

export default router;
