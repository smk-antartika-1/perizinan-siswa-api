import bcrypt from "bcryptjs";
import { db } from "../../config/db.js";
import { env } from "../../config/env.js";
import { sha256 } from "../../utils/security.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../../utils/tokens.js";
import {
  clearAuthCookies,
  readRefreshToken,
  setAuthCookies,
  withoutTokenPayload,
} from "./cookies.js";

async function storeRefreshToken(userId, token) {
  const expiresAt = new Date(
    Date.now() + env.refreshTokenTtlDays * 24 * 3600 * 1000,
  );
  await db("refresh_tokens").insert({
    user_id: userId,
    token_hash: sha256(token),
    expires_at: expiresAt,
  });
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    username: user.username,
    email: user.email,
    nis: user.nis,
    nip: user.nip,
    mustChangePassword: user.must_change_password,
  };
}

function rejectRefresh(res, next, status, message) {
  clearAuthCookies(res);
  return next({ status, message });
}

export async function login(req, res, next) {
  try {
    const { username, password } = req.validated.body;
    const user = await db("users")
      .whereRaw("lower(username) = lower(?)", [username])
      .first();
    if (!user || !user.is_active)
      return next({ status: 401, message: "Username/password salah" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return next({ status: 401, message: "Username/password salah" });
    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user.id);
    await storeRefreshToken(user.id, refreshToken);
    clearAuthCookies(res);
    setAuthCookies(res, { accessToken, refreshToken });
    res.json(withoutTokenPayload({ user: sanitizeUser(user), accessToken, refreshToken }));
  } catch (err) {
    next(err);
  }
}

export async function refresh(req, res, next) {
  try {
    const refreshToken = readRefreshToken(req);
    if (!refreshToken)
      return rejectRefresh(res, next, 400, "refreshToken wajib");
    const payload = verifyRefreshToken(refreshToken);
    const tokenHash = sha256(refreshToken);
    const saved = await db("refresh_tokens")
      .where({ user_id: payload.sub, token_hash: tokenHash, revoked_at: null })
      .andWhere("expires_at", ">", new Date())
      .first();
    if (!saved)
      return rejectRefresh(res, next, 401, "Refresh token tidak valid");
    await db("refresh_tokens")
      .where({ id: saved.id })
      .update({ revoked_at: new Date() });
    const user = await db("users")
      .where({ id: payload.sub, is_active: true })
      .first();
    if (!user)
      return rejectRefresh(res, next, 401, "User tidak ditemukan");
    const newAccess = signAccessToken(user);
    const newRefresh = signRefreshToken(user.id);
    await storeRefreshToken(user.id, newRefresh);
    clearAuthCookies(res);
    setAuthCookies(res, { accessToken: newAccess, refreshToken: newRefresh });
    res.json(withoutTokenPayload({ accessToken: newAccess, refreshToken: newRefresh }));
  } catch {
    rejectRefresh(res, next, 401, "Refresh token tidak valid");
  }
}

export async function logout(req, res, next) {
  try {
    const refreshToken = readRefreshToken(req);
    if (refreshToken) {
      await db("refresh_tokens")
        .where({ token_hash: sha256(refreshToken), revoked_at: null })
        .update({ revoked_at: new Date() });
    }
    clearAuthCookies(res);
    res.json({ message: "Logout berhasil" });
  } catch (err) {
    next(err);
  }
}

export async function me(req, res) {
  res.json({ user: sanitizeUser(req.user) });
}

export async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.validated.body;
    const ok = await bcrypt.compare(oldPassword, req.user.password_hash);
    if (!ok)
      return next({ status: 400, message: "Password lama tidak sesuai" });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db("users").where({ id: req.user.id }).update({
      password_hash: passwordHash,
      must_change_password: false,
    });
    res.json({ message: "Password berhasil diubah" });
  } catch (err) {
    next(err);
  }
}
