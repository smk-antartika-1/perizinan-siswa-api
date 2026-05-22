import assert from "node:assert/strict";
import test from "node:test";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  setAuthCookies,
  clearAuthCookies,
  withoutTokenPayload,
} from "./cookies.js";

function createResponseRecorder() {
  const calls = [];
  return {
    calls,
    cookie(name, value, options) {
      calls.push({ type: "cookie", name, value, options });
      return this;
    },
    clearCookie(name, options) {
      calls.push({ type: "clearCookie", name, options });
      return this;
    },
  };
}

test("setAuthCookies stores access and refresh tokens as httpOnly cookies", () => {
  const res = createResponseRecorder();

  setAuthCookies(res, {
    accessToken: "access-token",
    refreshToken: "refresh-token",
  });

  assert.deepEqual(
    res.calls.map(({ type, name, value }) => ({ type, name, value })),
    [
      { type: "cookie", name: ACCESS_COOKIE, value: "access-token" },
      { type: "cookie", name: REFRESH_COOKIE, value: "refresh-token" },
    ],
  );
  for (const call of res.calls) {
    assert.equal(call.options.httpOnly, true);
    assert.equal(call.options.sameSite, "lax");
    assert.equal(call.options.secure, false);
  }
});

test("clearAuthCookies clears both auth cookies", () => {
  const res = createResponseRecorder();

  clearAuthCookies(res);

  assert.deepEqual(
    res.calls.map(({ type, name }) => ({ type, name })),
    [
      { type: "clearCookie", name: ACCESS_COOKIE },
      { type: "clearCookie", name: REFRESH_COOKIE },
    ],
  );
});

test("withoutTokenPayload removes tokens from response body", () => {
  assert.deepEqual(
    withoutTokenPayload({
      user: { username: "siswa" },
      accessToken: "access-token",
      refreshToken: "refresh-token",
    }),
    { user: { username: "siswa" } },
  );
});
