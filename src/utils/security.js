import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function signQrToken(payload, expiresInMinutes = env.qrTokenTtlMinutes) {
  return jwt.sign(payload, env.jwtQrSecret, { expiresIn: `${expiresInMinutes}m` });
}

export function verifyQrToken(token) {
  return jwt.verify(token, env.jwtQrSecret);
}
