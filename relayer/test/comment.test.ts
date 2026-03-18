import { describe, it, expect, vi } from "vitest";

vi.mock("../src/lib/contract.js", () => ({
  submitComment: vi.fn(),
  resolveEnsName: vi.fn(async () => ""),
  slugToPostId: vi.fn(() => "0x" + "ab".repeat(32)),
}));

vi.mock("../src/lib/ratelimit.js", () => ({
  checkRateLimit: vi.fn(async () => true),
}));

import app from "../src/index.js";
import { submitComment } from "../src/lib/contract.js";
import { checkRateLimit } from "../src/lib/ratelimit.js";

const mockEnv = {
  RELAYER_PRIVATE_KEY: "0x" + "ab".repeat(32),
  CONTRACT_ADDRESS: "0x" + "00".repeat(20),
  RPC_URL: "https://rpc.example.com",
  ALLOWED_ORIGINS: "http://localhost:4321",
  RATE_LIMIT: {} as KVNamespace,
};

const validBody = {
  author: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  postSlug: "20260317-blogpost",
  username: "alice",
  content: "great post",
  signature:
    "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1c",
};

function post(body: unknown) {
  return app.request(
    "/comment",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    mockEnv,
  );
}

describe("POST /comment", () => {
  it("returns txHash on success", async () => {
    const txHash = `0x${"ff".repeat(32)}` as const;
    vi.mocked(submitComment).mockResolvedValueOnce(txHash);

    const res = await post(validBody);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ txHash });
  });

  it("returns 400 on validation error", async () => {
    const res = await post({ ...validBody, author: "bad" });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json).toHaveProperty("error");
  });

  it("returns 429 when rate limited", async () => {
    vi.mocked(checkRateLimit).mockResolvedValueOnce(false);
    const res = await post(validBody);
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "Too many requests" });
  });

  it("returns 500 on contract call failure", async () => {
    vi.mocked(submitComment).mockRejectedValueOnce(new Error("rpc error"));
    const res = await post(validBody);
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Transaction failed" });
  });
});
