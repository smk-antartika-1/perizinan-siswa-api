import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { uploadImport } from "../files/upload.js";
import {
  createUser,
  deleteUser,
  downloadImportTemplate,
  ensureXlsxFile,
  exportUsersXlsx,
  importStudents,
  importUsers,
  getUserStats,
  listUsers,
  previewImportUsers,
  updateUser,
} from "./controller.js";
import {
  createUserSchema,
  deleteUserSchema,
  exportUsersSchema,
  importUsersSchema,
  listUsersSchema,
  templateSchema,
  updateUserSchema,
  userStatsSchema,
} from "./schemas.js";

const router = Router();

router.use(requireAuth, requireRoles("admin"));

router.get("/users/stats", validate(userStatsSchema), getUserStats);
router.get("/users", validate(listUsersSchema), listUsers);
router.post("/users", validate(createUserSchema), createUser);
router.patch("/users/:id", validate(updateUserSchema), updateUser);
router.delete("/users/:id", validate(deleteUserSchema), deleteUser);
router.get("/users/export.xlsx", validate(exportUsersSchema), exportUsersXlsx);
router.get(
  "/import-template.xlsx",
  validate(templateSchema),
  downloadImportTemplate,
);
router.post(
  "/users/import-preview.xlsx",
  uploadImport.single("file"),
  ensureXlsxFile,
  validate(importUsersSchema),
  previewImportUsers,
);
router.post(
  "/users/import.xlsx",
  uploadImport.single("file"),
  ensureXlsxFile,
  validate(importUsersSchema),
  importUsers,
);
router.post(
  "/students/import.xlsx",
  uploadImport.single("file"),
  ensureXlsxFile,
  importStudents,
);

export default router;
