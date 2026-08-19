// @vitest-environment happy-dom
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const GUARD = new URL("../auth-guard.js", import.meta.url).pathname;

let firebaseMock;
let replace;

function installFirebaseMock({ existingApps = [] } = {}) {
  firebaseMock = {
    initializeApp: vi.fn((config) => ({ name: "[DEFAULT]", config })),
    getApps: vi.fn(() => existingApps),
    getApp: vi.fn(() => existingApps[0]),
    getAuth: vi.fn((app) => ({ app })),
    onAuthStateChanged: vi.fn()
  };
  globalThis.__firebaseMock = firebaseMock;
}

/** Runs the callback the guard registered with onAuthStateChanged. */
function emitAuthState(user) {
  const callback = firebaseMock.onAuthStateChanged.mock.calls[0][1];
  callback(user);
}

beforeEach(() => {
  vi.resetModules();
  installFirebaseMock();
  document.documentElement.style.visibility = "";
  replace = vi.fn();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { replace, href: "https://example.test/dashboard.html" }
  });
});

afterEach(() => {
  delete globalThis.__firebaseMock;
});

describe("auth-guard", () => {
  it("hides the document before the auth state is known", async () => {
    await import(GUARD);

    expect(document.documentElement.style.visibility).toBe("hidden");
    expect(replace).not.toHaveBeenCalled();
  });

  it("initializes Firebase with the AssetGuard project config", async () => {
    await import(GUARD);

    expect(firebaseMock.initializeApp).toHaveBeenCalledTimes(1);
    expect(firebaseMock.initializeApp.mock.calls[0][0]).toMatchObject({
      projectId: "assetguard-c8c8c",
      authDomain: "assetguard-c8c8c.firebaseapp.com"
    });
    expect(firebaseMock.getAuth).toHaveBeenCalledTimes(1);
  });

  it("reuses an already initialized Firebase app", async () => {
    const existingApp = { name: "[DEFAULT]" };
    installFirebaseMock({ existingApps: [existingApp] });

    await import(GUARD);

    expect(firebaseMock.initializeApp).not.toHaveBeenCalled();
    expect(firebaseMock.getApp).toHaveBeenCalledTimes(1);
    expect(firebaseMock.getAuth).toHaveBeenCalledWith(existingApp);
  });

  it("reveals the page for a signed in user", async () => {
    await import(GUARD);

    emitAuthState({ uid: "user-1" });

    expect(document.documentElement.style.visibility).toBe("");
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects a signed out visitor to the login page", async () => {
    await import(GUARD);

    emitAuthState(null);

    expect(replace).toHaveBeenCalledWith("index.html");
  });

  it("keeps the page hidden while redirecting a signed out visitor", async () => {
    await import(GUARD);

    emitAuthState(undefined);

    expect(document.documentElement.style.visibility).toBe("hidden");
    expect(replace).toHaveBeenCalledWith("index.html");
  });
});
