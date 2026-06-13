import { env } from "../../config/env.js";

export const ACCESS_COOKIE = "access_token";
export const REFRESH_COOKIE = "refresh_token";

const baseCookieOptions = {
  httpOnly: true,
  sameSite: env.cookieSameSite,
  secure: env.nodeEnv === "production",
  path: "/",
};

export function setAuthCookies(res, { accessToken, refreshToken }) {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions,
    maxAge: 15 * 60 * 1000,
  });
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions,
    maxAge: env.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res) {
  res.clearCookie(ACCESS_COOKIE, baseCookieOptions);
  res.clearCookie(REFRESH_COOKIE, baseCookieOptions);
}

export function withoutTokenPayload(payload) {
  return payload;
}

export function readAccessToken(req) {
  const auth = req.headers.authorization || "";
  return auth.startsWith("Bearer ")
    ? auth.slice(7)
    : req.cookies?.[ACCESS_COOKIE] || null;
}

export function readRefreshToken(req) {
  return req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken || null;
}
