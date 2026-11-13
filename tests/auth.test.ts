import { describe, expect, it } from "vitest";
import { Credentials, hashPassword, normalizeEmail, verifyPassword } from "@/auth/password";

describe("пароли", () => {
  it("хеш не содержит пароль, у каждого хеша своя соль, проверка работает", () => {
    const a = hashPassword("Correct-Horse-1"), b = hashPassword("Correct-Horse-1");
    expect(a).not.toContain("Correct-Horse-1");
    expect(a).not.toBe(b);
    expect(verifyPassword("Correct-Horse-1", a)).toBe(true);
    expect(verifyPassword("Correct-Horse-2", a)).toBe(false);
    expect(verifyPassword("x", "мусор")).toBe(false);
    expect(verifyPassword("x", "s1$zz$yy")).toBe(false);
  });
  it("email нормализуется, слабые данные отклоняются", () => {
    expect(normalizeEmail("  User@Mail.COM ")).toBe("user@mail.com");
    expect(Credentials.safeParse({ email: "User@Mail.com", password: "12345678" })).toMatchObject({ success: true, data: { email: "user@mail.com" } });
    expect(Credentials.safeParse({ email: "не email", password: "12345678" }).success).toBe(false);
    expect(Credentials.safeParse({ email: "a@b.co", password: "short" }).success).toBe(false);
    expect(Credentials.safeParse({ email: "a@b.co", password: "12345678", role: "admin" }).success).toBe(false);
  });
});