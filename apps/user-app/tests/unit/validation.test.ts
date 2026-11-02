import { parseAmount, signupSchema, phoneSchema } from "@/lib/validation";
import { safeCallback, money } from "@/lib/format";
import fc from "fast-check";

describe("Wallet input boundaries", () => {
  test.each([
    "0",
    "0.99",
    "-1",
    "1.001",
    "NaN",
    "Infinity",
    "1e3",
    "100001",
    "1x",
    "",
  ])("rejects ambiguous or invalid amount %s", (value) =>
    expect(parseAmount(value)).toBeNull(),
  );
  test.each([
    ["1", 100],
    ["1.01", 101],
    ["12.5", 1250],
    ["100000.00", 10_000_000],
  ])("parses %s exactly into paise", (value, expected) =>
    expect(parseAmount(String(value))).toBe(expected),
  );
  test("all valid integer paise amounts round-trip without rounding errors", () => {
    fc.assert(
      fc.property(fc.integer({ min: 100, max: 10_000_000 }), (paise) => {
        const value = `${Math.floor(paise / 100)}.${String(paise % 100).padStart(2, "0")}`;
        expect(parseAmount(value)).toBe(paise);
      }),
    );
  });
  test("phone numbers contain exactly ten digits", () => {
    expect(phoneSchema.safeParse("9999999001").success).toBe(true);
    for (const value of ["123", "+919999999001", "abcdefghij", "99999990011"])
      expect(phoneSchema.safeParse(value).success).toBe(false);
  });
  test("signup normalizes email and enforces password and name requirements", () => {
    const input = {
      name: " Alice ",
      email: " ALICE@EXAMPLE.COM ",
      phone: "9999999001",
      password: "password123",
    };
    expect(signupSchema.parse(input)).toMatchObject({
      name: "Alice",
      email: "alice@example.com",
    });
    expect(
      signupSchema.safeParse({ ...input, password: "short" }).success,
    ).toBe(false);
    expect(signupSchema.safeParse({ ...input, name: " " }).success).toBe(false);
  });
  test("sign-in callback remains inside the app", () => {
    for (const url of [
      "https://attacker.test",
      "//attacker.test",
      "/\\attacker.test",
      null,
    ])
      expect(safeCallback(url)).toBe("/dashboard");
    expect(safeCallback("/transfer?tab=send")).toBe("/transfer?tab=send");
  });
  test("currency formatting uses two decimals", () => {
    expect(money(101)).toBe("₹1.01");
    expect(money(100000)).toBe("₹1,000.00");
  });
});
