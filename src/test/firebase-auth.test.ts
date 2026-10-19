import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  login: vi.fn(), signup: vi.fn(), reset: vi.fn(), popup: vi.fn(), profile: vi.fn(),
}));
vi.mock("firebase/app", () => ({ getApps: () => [], initializeApp: () => ({}), getApp: () => ({}) }));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({ client: true }),
  GoogleAuthProvider: class { setCustomParameters() {} },
  signInWithPopup: sdk.popup,
  signInWithEmailAndPassword: sdk.login,
  createUserWithEmailAndPassword: sdk.signup,
  sendPasswordResetEmail: sdk.reset,
  updateProfile: sdk.profile,
  onAuthStateChanged: vi.fn(),
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  for (const key of ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"]) vi.stubEnv(`VITE_FIREBASE_${key}`, "test-config");
});
afterEach(() => vi.unstubAllEnvs());

describe("Firebase authentication actions", () => {
  it("logs in existing users without attempting account creation", async () => {
    const { submitEmailAccount } = await import("@/lib/firebase-auth");
    await submitEmailAccount({ email: " person@example.com ", password: "valid-password" }, false);
    expect(sdk.login).toHaveBeenCalledWith({ client: true }, "person@example.com", "valid-password");
    expect(sdk.signup).not.toHaveBeenCalled();
  });
  it("creates an account only in sign-up mode and saves the optional name", async () => {
    sdk.signup.mockResolvedValueOnce({ user: { uid: "new-user" } });
    sdk.profile.mockResolvedValueOnce(undefined);
    const { submitEmailAccount } = await import("@/lib/firebase-auth");
    await submitEmailAccount({ email: "person@example.com", password: "valid-password", name: " Saurabh " }, true);
    expect(sdk.signup).toHaveBeenCalledWith({ client: true }, "person@example.com", "valid-password");
    expect(sdk.profile).toHaveBeenCalledWith({ uid: "new-user" }, { displayName: "Saurabh" });
    expect(sdk.login).not.toHaveBeenCalled();
  });
  it("rejects empty reset email without sending a request", async () => {
    const { resetEmailPassword } = await import("@/lib/firebase-auth");
    expect(() => resetEmailPassword("")).toThrow();
    expect(sdk.reset).not.toHaveBeenCalled();
  });
  it("sends password reset to the validated supplied email", async () => {
    const { resetEmailPassword } = await import("@/lib/firebase-auth");
    await resetEmailPassword(" person@example.com ");
    expect(sdk.reset).toHaveBeenCalledWith({ client: true }, "person@example.com");
  });
  it("opens the Firebase Google provider popup", async () => {
    const { loginWithGoogle } = await import("@/lib/firebase-auth");
    await loginWithGoogle();
    expect(sdk.popup).toHaveBeenCalledOnce();
    expect(sdk.popup.mock.calls[0]?.[1]).toHaveProperty("setCustomParameters");
  });
});