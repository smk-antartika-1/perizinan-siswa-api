import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import {
  createClass,
  deleteClass,
  listClasses,
  listStudentsByClass,
  updateClass,
} from "./controller.js";
import {
  createClassSchema,
  deleteClassSchema,
  updateClassSchema,
} from "./schemas.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  requireRoles("wali_kelas", "guru_piket", "admin"),
  listClasses,
);
router.get(
  "/students",
  requireAuth,
  requireRoles("wali_kelas", "guru_piket", "admin"),
  listStudentsByClass,
);
router.post(
  "/",
  requireAuth,
  requireRoles("admin"),
  validate(createClassSchema),
  createClass,
);
router.patch(
  "/:id",
  requireAuth,
  requireRoles("admin"),
  validate(updateClassSchema),
  updateClass,
);
router.delete(
  "/:id",
  requireAuth,
  requireRoles("admin"),
  validate(deleteClassSchema),
  deleteClass,
);

export default router;
