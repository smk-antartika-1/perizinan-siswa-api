import dotenv from "dotenv";

dotenv.config();

const required = [
  "PORT",
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_QR_SECRET",
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

const expiryIntervalMinutes = Number(
  process.env.PERMISSION_EXPIRY_INTERVAL_MINUTES || 5,
);

const corsOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const env = {
  port: Number(process.env.PORT || 8000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtQrSecret: process.env.JWT_QR_SECRET,
  accessTokenTtl: process.env.JWT_ACCESS_TTL || "15m",
  refreshTokenTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS || 14),
  qrTokenTtlMinutes: Number(process.env.QR_TOKEN_TTL_MINUTES || 30),
  permissionExpiryIntervalMinutes: Number.isFinite(expiryIntervalMinutes)
    ? expiryIntervalMinutes
    : 5,
  uploadDir: process.env.UPLOAD_DIR || "uploads",
  appUrl: process.env.APP_URL || "http://127.0.0.1:8000",
  corsOrigins,
  cookieSameSite: process.env.COOKIE_SAME_SITE || "lax",
};
