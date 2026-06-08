import assert from "node:assert/strict";
import test from "node:test";
import { RETURN_MANAGEMENT_ROLES, SCAN_MANAGEMENT_ROLES } from "./routes.js";

test("return management is limited to school staff roles", () => {
  assert.deepEqual(RETURN_MANAGEMENT_ROLES, [
    "guru_piket",
    "security",
    "wali_kelas",
    "admin",
  ]);
  assert.equal(RETURN_MANAGEMENT_ROLES.includes("siswa"), false);
});

test("scan management is limited to security operators", () => {
  assert.deepEqual(SCAN_MANAGEMENT_ROLES, ["security", "admin"]);
  assert.equal(SCAN_MANAGEMENT_ROLES.includes("siswa"), false);
  assert.equal(SCAN_MANAGEMENT_ROLES.includes("wali_kelas"), false);
});
