import { Router } from "express";
import { requireAuth, requireRoles } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { upload } from "../files/upload.js";
import {
  createUser,
  deleteUser,
  downloadImportTemplate,
  exportUsersCsv,
  importStudents,
  importUsers,
  listUsers,
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
} from "./schemas.js";

const router = Router();

router.use(requireAuth, requireRoles("admin"));

router.get("/users", validate(listUsersSchema), listUsers);
router.post("/users", validate(createUserSchema), createUser);
router.patch("/users/:id", validate(updateUserSchema), updateUser);
router.delete("/users/:id", validate(deleteUserSchema), deleteUser);
router.get("/users/export.csv", validate(exportUsersSchema), exportUsersCsv);
router.get(
  "/import-template.csv",
  validate(templateSchema),
  downloadImportTemplate,
);
router.post(
  "/users/import.xlsx",
  upload.single("file"),
  validate(importUsersSchema),
  importUsers,
);
router.post("/students/import.xlsx", upload.single("file"), importStudents);

export default router;
