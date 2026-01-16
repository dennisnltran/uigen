import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

const mockCookieStore = {
  set: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockSignJWT = {
  setProtectedHeader: vi.fn().mockReturnThis(),
  setExpirationTime: vi.fn().mockReturnThis(),
  setIssuedAt: vi.fn().mockReturnThis(),
  sign: vi.fn().mockResolvedValue("mock-jwt-token"),
};

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

vi.mock("jose", () => ({
  SignJWT: vi.fn(() => mockSignJWT),
  jwtVerify: vi.fn(),
}));

const { createSession } = await import("../auth");

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("creates a session with valid userId and email", async () => {
    const userId = "user123";
    const email = "test@example.com";
    const { SignJWT } = await import("jose");

    await createSession(userId, email);

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email,
        expiresAt: expect.any(Date),
      })
    );
  });

  test("sets expiration date to 7 days from now", async () => {
    const userId = "user123";
    const email = "test@example.com";
    const beforeCall = Date.now();
    const { SignJWT } = await import("jose");

    await createSession(userId, email);

    const callArgs = vi.mocked(SignJWT).mock.calls[0][0] as any;
    const expiresAt = new Date(callArgs.expiresAt).getTime();
    const expectedExpiration = beforeCall + 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiration - 1000);
    expect(expiresAt).toBeLessThanOrEqual(expectedExpiration + 1000);
  });

  test("configures JWT with HS256 algorithm", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockSignJWT.setProtectedHeader).toHaveBeenCalledWith({
      alg: "HS256",
    });
  });

  test("sets JWT expiration time to 7 days", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockSignJWT.setExpirationTime).toHaveBeenCalledWith("7d");
  });

  test("sets JWT issued at timestamp", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
  });

  test("signs JWT with secret", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockSignJWT.sign).toHaveBeenCalled();
    const signArg = mockSignJWT.sign.mock.calls[0][0];
    expect(signArg).toHaveProperty("byteLength");
    expect(signArg.byteLength).toBeGreaterThan(0);
  });

  test("sets HTTP-only cookie with correct name", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "auth-token",
      "mock-jwt-token",
      expect.any(Object)
    );
  });

  test("sets cookie with httpOnly flag", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.httpOnly).toBe(true);
  });

  test("sets cookie with secure flag in production", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.secure).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  test("does not set secure flag in development", async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.secure).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  test("sets cookie with sameSite lax", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.sameSite).toBe("lax");
  });

  test("sets cookie with correct expiration date", async () => {
    const userId = "user123";
    const email = "test@example.com";
    const beforeCall = Date.now();

    await createSession(userId, email);

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    const expiresAt = new Date(cookieOptions.expires).getTime();
    const expectedExpiration = beforeCall + 7 * 24 * 60 * 60 * 1000;

    expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiration - 1000);
    expect(expiresAt).toBeLessThanOrEqual(expectedExpiration + 1000);
  });

  test("sets cookie with root path", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    const cookieOptions = mockCookieStore.set.mock.calls[0][2];
    expect(cookieOptions.path).toBe("/");
  });

  test("handles special characters in email", async () => {
    const userId = "user123";
    const email = "test+tag@example.co.uk";
    const { SignJWT } = await import("jose");

    await createSession(userId, email);

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email,
      })
    );
  });

  test("handles long userId", async () => {
    const userId = "a".repeat(100);
    const email = "test@example.com";
    const { SignJWT } = await import("jose");

    await createSession(userId, email);

    expect(SignJWT).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        email,
      })
    );
  });

  test("chains JWT builder methods correctly", async () => {
    const userId = "user123";
    const email = "test@example.com";

    await createSession(userId, email);

    expect(mockSignJWT.setProtectedHeader).toHaveBeenCalled();
    expect(mockSignJWT.setExpirationTime).toHaveBeenCalled();
    expect(mockSignJWT.setIssuedAt).toHaveBeenCalled();
    expect(mockSignJWT.sign).toHaveBeenCalled();

    const callOrder = [
      mockSignJWT.setProtectedHeader.mock.invocationCallOrder[0],
      mockSignJWT.setExpirationTime.mock.invocationCallOrder[0],
      mockSignJWT.setIssuedAt.mock.invocationCallOrder[0],
      mockSignJWT.sign.mock.invocationCallOrder[0],
    ];

    for (let i = 1; i < callOrder.length; i++) {
      expect(callOrder[i]).toBeGreaterThan(callOrder[i - 1]);
    }
  });
});
