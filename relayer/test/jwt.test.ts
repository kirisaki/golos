import { describe, it, expect } from "vitest";
import { issueJwt, verifyJwt } from "../src/lib/jwt.js";

const secret = "test-secret-key-for-jwt";

describe("JWT", () => {
  it("issues and verifies a token", async () => {
    const token = await issueJwt(secret, "user-123", "0xabc", "Alice");
    const payload = await verifyJwt(secret, token);

    expect(payload.sub).toBe("user-123");
    expect(payload.wallet).toBe("0xabc");
    expect(payload.displayName).toBe("Alice");
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  it("rejects a token with wrong secret", async () => {
    const token = await issueJwt(secret, "user-123", "0xabc", "Alice");
    await expect(verifyJwt("wrong-secret", token)).rejects.toThrow();
  });
});
