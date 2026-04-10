// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";

// Must mock "server-only" before importing auth
vi.mock("server-only", () => ({}));

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Import after mocks are set up
import { createSession, getSession, deleteSession, verifySession } from "@/lib/auth";
import { NextRequest } from "next/server";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createSession", () => {
  test("sets an httpOnly cookie with the JWT token", async () => {
    await createSession("user-123", "user@example.com");

    expect(mockCookieStore.set).toHaveBeenCalledOnce();
    const [name, token, options] = mockCookieStore.set.mock.calls[0];
    expect(name).toBe("auth-token");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("sets cookie expiry ~7 days from now", async () => {
    const before = Date.now();
    await createSession("user-123", "user@example.com");
    const after = Date.now();

    const [, , options] = mockCookieStore.set.mock.calls[0];
    const expiresMs = (options.expires as Date).getTime();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("sets secure flag in production", async () => {
    const original = process.env.NODE_ENV;
    // @ts-expect-error overriding read-only env
    process.env.NODE_ENV = "production";
    await createSession("user-123", "user@example.com");
    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(true);
    // @ts-expect-error restore
    process.env.NODE_ENV = original;
  });

  test("does not set secure flag in development", async () => {
    const original = process.env.NODE_ENV;
    // @ts-expect-error overriding read-only env
    process.env.NODE_ENV = "development";
    await createSession("user-123", "user@example.com");
    const [, , options] = mockCookieStore.set.mock.calls[0];
    expect(options.secure).toBe(false);
    // @ts-expect-error restore
    process.env.NODE_ENV = original;
  });
});

describe("getSession", () => {
  test("returns null when no cookie is present", async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns null for an invalid/tampered token", async () => {
    mockCookieStore.get.mockReturnValue({ value: "not.a.valid.jwt" });
    const session = await getSession();
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token", async () => {
    // Create a real token by going through createSession
    let capturedToken = "";
    mockCookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });
    await createSession("user-42", "hello@example.com");

    // Now verify it via getSession
    mockCookieStore.get.mockReturnValue({ value: capturedToken });
    const session = await getSession();

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-42");
    expect(session?.email).toBe("hello@example.com");
  });
});

describe("deleteSession", () => {
  test("deletes the auth-token cookie", async () => {
    await deleteSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("auth-token");
  });
});

describe("verifySession", () => {
  function makeRequest(cookieValue?: string): NextRequest {
    const headers: Record<string, string> = {};
    if (cookieValue !== undefined) {
      headers["cookie"] = `auth-token=${cookieValue}`;
    }
    return new NextRequest("http://localhost/api/test", { headers });
  }

  test("returns null when no cookie is present in the request", async () => {
    const req = makeRequest();
    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns null for an invalid token in the request", async () => {
    const req = makeRequest("garbage.token.value");
    const session = await verifySession(req);
    expect(session).toBeNull();
  });

  test("returns session payload for a valid token in the request", async () => {
    // Capture a real token from createSession
    let capturedToken = "";
    mockCookieStore.set.mockImplementation((_name: string, token: string) => {
      capturedToken = token;
    });
    await createSession("user-99", "verify@example.com");

    const req = makeRequest(capturedToken);
    const session = await verifySession(req);

    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user-99");
    expect(session?.email).toBe("verify@example.com");
  });

  test("returns null for a structurally valid JWT signed with a different secret", async () => {
    // Manually craft a JWT signed with a different secret using jose
    const { SignJWT } = await import("jose");
    const differentSecret = new TextEncoder().encode("a-completely-different-secret");
    const foreignToken = await new SignJWT({ userId: "evil", email: "evil@example.com", expiresAt: new Date() })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(differentSecret);

    const req = makeRequest(foreignToken);
    const session = await verifySession(req);
    expect(session).toBeNull();
  });
});
