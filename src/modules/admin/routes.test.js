import assert from "node:assert/strict";
import test from "node:test";
import router from "./routes.js";

function routePaths() {
  return router.stack
    .map((layer) => layer.route?.path)
    .filter(Boolean);
}

test("admin import/export file routes are XLSX only", () => {
  const paths = routePaths();

  assert.equal(paths.includes("/users/export.xlsx"), true);
  assert.equal(paths.includes("/import-template.xlsx"), true);
  assert.equal(paths.includes("/users/import-preview.xlsx"), true);
  assert.equal(paths.includes("/users/import.xlsx"), true);
  assert.equal(paths.includes("/students/import.xlsx"), true);
  assert.equal(paths.includes("/users/export.csv"), false);
  assert.equal(paths.includes("/import-template.csv"), false);
});
