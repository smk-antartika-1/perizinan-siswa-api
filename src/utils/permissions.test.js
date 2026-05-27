import test from "node:test";
import assert from "node:assert/strict";
import {
  getPermissionExpiry,
  isPermissionExpired,
  isNoReturnPermission,
} from "./permissions.js";

const departure = "2026-05-23T01:25:00.000Z";

test("sakit / pulang_tidak_kembali expires at end of departure day", () => {
  const row = {
    status: "approved_piket",
    type: "pulang_tidak_kembali",
    category: "sakit",
    departure_time: departure,
    estimated_return_time: null,
  };

  const expiresAt = getPermissionExpiry(row);
  assert.ok(expiresAt);
  assert.equal(expiresAt.getHours(), 23);
  assert.equal(expiresAt.getMinutes(), 59);

  const nextDay = new Date("2026-05-24T00:00:01.000Z");
  assert.equal(isPermissionExpired(row, nextDay), true);

  const sameDay = new Date("2026-05-23T12:00:00.000Z");
  assert.equal(isPermissionExpired(row, sameDay), false);
});

test("keluar_masuk with estimated return uses estimated time", () => {
  const estimated = "2026-05-23T15:00:00.000Z";
  const row = {
    status: "approved_piket",
    type: "keluar_masuk",
    category: "keperluan",
    departure_time: departure,
    estimated_return_time: estimated,
  };

  assert.equal(getPermissionExpiry(row).toISOString(), new Date(estimated).toISOString());
  assert.equal(
    isPermissionExpired(row, new Date("2026-05-23T14:00:00.000Z")),
    false,
  );
  assert.equal(
    isPermissionExpired(row, new Date("2026-05-23T16:00:00.000Z")),
    true,
  );
});

test("keluar_masuk without estimated return expires end of departure day", () => {
  const row = {
    status: "approved_piket",
    type: "keluar_masuk",
    category: "keperluan",
    departure_time: departure,
    estimated_return_time: null,
  };

  assert.ok(isNoReturnPermission({ type: "pulang_tidak_kembali" }));
  assert.equal(
    isPermissionExpired(row, new Date("2026-05-24T08:00:00.000Z")),
    true,
  );
});
