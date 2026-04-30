import { Router } from "express";
import { requireAuth } from "../../middlewares/auth.js";
import { upload } from "../files/upload.js";
import { getProfile, updateProfile } from "./controller.js";

const router = Router();
router.get("/", requireAuth, getProfile);
router.patch("/", requireAuth, upload.single("avatar"), updateProfile);

export default router;
