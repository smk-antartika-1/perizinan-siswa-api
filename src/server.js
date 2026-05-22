import app from "./app.js";
import { db } from "./config/db.js";
import { env } from "./config/env.js";
import { startPermissionExpiryJob } from "./jobs/permission-expiry.js";

const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${env.port}`);
});

const stopExpiryJob = startPermissionExpiryJob();

for (const sig of ["SIGINT", "SIGTERM"]) {
  process.on(sig, async () => {
    stopExpiryJob();
    await db.destroy();
    server.close(() => process.exit(0));
  });
}
