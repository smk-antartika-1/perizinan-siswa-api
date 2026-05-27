import test from "node:test";
import assert from "node:assert/strict";
import { normalizeClassName } from "./classes.js";

test("normalizeClassName trims leading/trailing spaces", () => {
  assert.equal(normalizeClassName("  XII IPA 1  "), "XII IPA 1");
});

test("normalizeClassName collapses internal whitespace", () => {
  assert.equal(normalizeClassName("XII  IPA   1"), "XII IPA 1");
});

test("normalizeClassName handles empty/null", () => {
  assert.equal(normalizeClassName(""), "");
  assert.equal(normalizeClassName(null), "");
  assert.equal(normalizeClassName(undefined), "");
});

test("normalizeClassName preserves original casing", () => {
  assert.equal(normalizeClassName("xii ipa 1"), "xii ipa 1");
  assert.equal(normalizeClassName("XII IPA 1"), "XII IPA 1");
});

test("normalizeClassName handles tabs and newlines", () => {
  assert.equal(normalizeClassName("XII\tIPA\n1"), "XII IPA 1");
});

// Import preview resolution logic (pure, no DB)
test("loadClassMap-style lookup is case-insensitive after normalization", () => {
  // Simulate the map as built in loadClassMap
  const classes = [
    { id: "uuid-1", name: "XII IPA 1" },
    { id: "uuid-2", name: "XII IPS 2" },
  ];
  const map = new Map(
    classes.map((c) => [normalizeClassName(c.name).toLowerCase(), c.id]),
  );

  // Exact match
  assert.equal(map.get(normalizeClassName("XII IPA 1").toLowerCase()), "uuid-1");

  // Case-insensitive
  assert.equal(map.get(normalizeClassName("xii ipa 1").toLowerCase()), "uuid-1");

  // With extra spaces
  assert.equal(map.get(normalizeClassName("XII  IPA  1").toLowerCase()), "uuid-1");

  // Not found
  assert.equal(map.get(normalizeClassName("XII IPA 3").toLowerCase()), undefined);
});

test("import preview row: missing class gets kelasStatus=missing", () => {
  const map = new Map([["xii ipa 1", "uuid-1"]]);
  const rawKelas = "XII IPA 3";
  const normalized = normalizeClassName(rawKelas).toLowerCase();
  const classId = map.get(normalized) ?? null;
  assert.equal(classId, null);
});

test("import preview row: matched class gets classId", () => {
  const map = new Map([["xii ipa 1", "uuid-1"]]);
  const rawKelas = "XII IPA 1";
  const normalized = normalizeClassName(rawKelas).toLowerCase();
  const classId = map.get(normalized) ?? null;
  assert.equal(classId, "uuid-1");
});
