import { Router } from "express";
import { changePassword, login, logout, me, refresh } from "./controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { validate } from "../../middlewares/validate.js";
import { changePasswordSchema, loginSchema } from "./schemas.js";

const router = Router();

router.post("/login", validate(loginSchema), login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
router.post("/change-password", requireAuth, validate(changePasswordSchema), changePassword);

export default router;
