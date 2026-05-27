import { db } from "../config/db.js";

export function normalizeClassName(name) {
  if (!name) return "";
  return String(name)
    .trim()
    .replace(/\s+/g, " ");
}

export async function resolveClassId(name, { trx } = {}) {
  const normalized = normalizeClassName(name);
  if (!normalized) return null;
  const query = (trx || db)("classes").whereRaw(
    "lower(name) = lower(?)",
    [normalized],
  );
  const row = await query.first();
  return row?.id ?? null;
}

export async function resolveClassIdOrFail(name) {
  const id = await resolveClassId(name);
  if (!id) {
    const err = new Error(`Kelas "${name}" tidak ditemukan di master data`);
    err.status = 400;
    throw err;
  }
  return id;
}

export async function loadClassMap() {
  const rows = await db("classes").select("id", "name");
  const map = new Map();
  for (const row of rows) {
    map.set(normalizeClassName(row.name).toLowerCase(), row.id);
  }
  return map;
}
