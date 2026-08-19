import { defineConfig } from "vitest/config";

// The browser modules import Firebase straight from the gstatic CDN, which the
// test runner cannot fetch. This plugin rewrites those specifiers to local
// stubs so the modules can be exercised under test.
const stubFirebaseCdn = {
  name: "stub-firebase-cdn",
  enforce: "pre",
  transform(code, id) {
    if (!/\/(auth-guard|settings)\.js$/.test(id)) return null;
    const stubbed = code.replace(
      /https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+\/firebase-(app|auth|database)\.js/g,
      (_match, module) => `/test/stubs/firebase-${module}.js`
    );
    return stubbed === code ? null : { code: stubbed, map: null };
  }
};

export default defineConfig({
  plugins: [stubFirebaseCdn],
  test: {
    environment: "node",
    include: ["test/**/*.test.js"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["auth-guard.js", "settings.js", "server.js"]
    }
  }
});
