import { db } from "../config/db.js";
import { verifyAccessToken } from "../utils/tokens.js";
import { readAccessToken } from "../modules/auth/cookies.js";

export async function requireAuth(req, _res, next) {
  const token = readAccessToken(req);
  if (!token) return next({ status: 401, message: "Unauthorized" });
  try {
    const payload = verifyAccessToken(token);
    const user = await db("users").where({ id: payload.sub, is_active: true }).first();
    if (!user) return next({ status: 401, message: "Unauthorized" });
    req.user = user;
    return next();
  } catch {
    return next({ status: 401, message: "Invalid token" });
  }
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next({ status: 401, message: "Unauthorized" });
    if (req.user.role === "admin" || roles.includes(req.user.role)) return next();
    return next({ status: 403, message: "Forbidden" });
  };
}
