import assert from "node:assert/strict";
import test from "node:test";
import router from "./routes.js";

function findRoute(path, method) {
  return router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods[method],
  );
}

test("QR generation is available to every authenticated role", () => {
  const route = findRoute("/:id/qr", "post");

  assert.ok(route);
  assert.deepEqual(
    route.route.stack.map((layer) => layer.handle.name),
    ["", "generateQr"],
  );
});
