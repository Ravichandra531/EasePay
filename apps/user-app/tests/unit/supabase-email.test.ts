/** @jest-environment node */
import { sendEmailCode, verifyEmailCode } from "@/lib/supabase-email";
const original = { ...process.env };
const realFetch = globalThis.fetch;
const mockFetch = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  process.env = {
    ...original,
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test",
  };
  globalThis.fetch = mockFetch;
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      user: {
        id: "supabase-user",
        email: "alice@example.com",
        email_confirmed_at: new Date().toISOString(),
      },
    }),
  });
});
afterAll(() => {
  process.env = original;
  globalThis.fetch = realFetch;
});
test("sending normalizes email and uses only the publishable key with no returned secrets", async () => {
  await expect(sendEmailCode(" Alice@Example.com ")).resolves.toBeUndefined();
  expect(fetch).toHaveBeenCalledWith(
    "https://example.supabase.co/auth/v1/otp",
    expect.objectContaining({
      method: "POST",
      cache: "no-store",
      headers: {
        apikey: "sb_publishable_test",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: "alice@example.com", create_user: true }),
    }),
  );
});
test("verification trusts a matching confirmed email returned by Supabase", async () => {
  await expect(verifyEmailCode("Alice@Example.com", "123456")).resolves.toBe(
    "alice@example.com",
  );
  expect(fetch).toHaveBeenCalledWith(
    "https://example.supabase.co/auth/v1/verify",
    expect.objectContaining({
      body: JSON.stringify({
        email: "alice@example.com",
        token: "123456",
        type: "email",
      }),
    }),
  );
});
test.each([
  { id: "u", email: "other@example.com", email_confirmed_at: "2026-11-02" },
  { id: "u", email: "alice@example.com", email_confirmed_at: null },
  {},
])(
  "mismatched or unconfirmed identities cannot authenticate: %p",
  async (user) => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ user }),
    });
    await expect(
      verifyEmailCode("alice@example.com", "123456"),
    ).rejects.toThrow("verification failed");
  },
);
test.each(["12345", "abcdef", undefined])(
  "rejects malformed codes before contacting Supabase: %p",
  async (code) => {
    await expect(verifyEmailCode("alice@example.com", code)).rejects.toThrow(
      "six-digit",
    );
    expect(fetch).not.toHaveBeenCalled();
  },
);
test("invalid email is rejected before sending", async () => {
  await expect(sendEmailCode("not-an-email")).rejects.toThrow("valid email");
  expect(fetch).not.toHaveBeenCalled();
});
test("invalid, expired, or reused codes do not become successful proofs", async () => {
  mockFetch.mockResolvedValue({ ok: false, status: 403 });
  await expect(verifyEmailCode("alice@example.com", "123456")).rejects.toThrow(
    "incorrect or expired",
  );
});
test("provider throttling and network failures produce safe actionable errors", async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
  await expect(sendEmailCode("alice@example.com")).rejects.toThrow(
    "Too many requests",
  );
  mockFetch.mockRejectedValueOnce(new Error("private provider details"));
  await expect(sendEmailCode("alice@example.com")).rejects.toThrow(
    "Could not reach",
  );
});
test("missing configuration never falls back to a development code", async () => {
  delete process.env.SUPABASE_PUBLISHABLE_KEY;
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  await expect(sendEmailCode("alice@example.com")).rejects.toThrow(
    "not configured",
  );
  expect(fetch).not.toHaveBeenCalled();
});
