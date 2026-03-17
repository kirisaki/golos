import { describe, it, expect, vi } from "vitest";
import { checkRateLimit } from "../src/lib/ratelimit.js";

function createMockKV(): KVNamespace {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  } as unknown as KVNamespace;
}

describe("checkRateLimit", () => {
  it("allows first request", async () => {
    const kv = createMockKV();
    const result = await checkRateLimit(kv, "1.2.3.4");
    expect(result).toBe(true);
    expect(kv.put).toHaveBeenCalledWith("ratelimit:1.2.3.4", "1", {
      expirationTtl: 60,
    });
  });

  it("blocks second request from same IP", async () => {
    const kv = createMockKV();
    await checkRateLimit(kv, "1.2.3.4");
    const result = await checkRateLimit(kv, "1.2.3.4");
    expect(result).toBe(false);
  });

  it("allows requests from different IPs", async () => {
    const kv = createMockKV();
    const r1 = await checkRateLimit(kv, "1.2.3.4");
    const r2 = await checkRateLimit(kv, "5.6.7.8");
    expect(r1).toBe(true);
    expect(r2).toBe(true);
  });
});
