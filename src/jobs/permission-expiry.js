import { db } from "../config/db.js";
import { env } from "../config/env.js";

function getStartOfToday() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

async function expirePermissions() {
  const now = new Date();
  const startOfToday = getStartOfToday();

  await db("permissions")
    .where({ status: "approved_piket" })
    .andWhere("type", "=", "keluar_masuk")
    .andWhere((qb) => {
      qb.whereNotNull("estimated_return_time").andWhere(
        "estimated_return_time",
        "<=",
        now,
      );
      qb.orWhere((sub) => {
        sub
          .whereNull("estimated_return_time")
          .andWhere("departure_time", "<", startOfToday);
      });
    })
    .update({ status: "expired", updated_at: now });
}

export function startPermissionExpiryJob() {
  const intervalMinutes = env.permissionExpiryIntervalMinutes;
  const intervalMs = Math.max(intervalMinutes, 1) * 60000;

  expirePermissions().catch(() => undefined);
  const timer = setInterval(() => {
    expirePermissions().catch(() => undefined);
  }, intervalMs);

  return () => clearInterval(timer);
}
