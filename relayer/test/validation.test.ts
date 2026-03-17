import { describe, it, expect } from "vitest";
import { validateCommentRequest } from "../src/lib/validation.js";

describe("validateCommentRequest", () => {
  const valid = {
    author: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
    postSlug: "20260317-blogpost",
    username: "alice",
    content: "great post",
    signature:
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab1c",
  };

  it("accepts valid request", () => {
    const result = validateCommentRequest(valid);
    expect(result.ok).toBe(true);
  });

  it("rejects invalid author address", () => {
    const result = validateCommentRequest({ ...valid, author: "not-an-address" });
    expect(result).toEqual({ ok: false, error: "Invalid author address" });
  });

  it("rejects empty postSlug", () => {
    const result = validateCommentRequest({ ...valid, postSlug: "" });
    expect(result).toEqual({ ok: false, error: "postSlug is required" });
  });

  it("rejects empty username", () => {
    const result = validateCommentRequest({ ...valid, username: "" });
    expect(result).toEqual({ ok: false, error: "username is required" });
  });

  it("rejects empty content", () => {
    const result = validateCommentRequest({ ...valid, content: "" });
    expect(result).toEqual({ ok: false, error: "content is required" });
  });

  it("rejects content exceeding 5120 bytes", () => {
    const result = validateCommentRequest({
      ...valid,
      content: "a".repeat(5121),
    });
    expect(result).toEqual({ ok: false, error: "content exceeds 5120 bytes" });
  });

  it("accepts content at exactly 5120 bytes", () => {
    const result = validateCommentRequest({
      ...valid,
      content: "a".repeat(5120),
    });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid signature", () => {
    const result = validateCommentRequest({
      ...valid,
      signature: "not-hex",
    });
    expect(result).toEqual({ ok: false, error: "Invalid signature" });
  });

  it("rejects null body", () => {
    const result = validateCommentRequest(null);
    expect(result).toEqual({ ok: false, error: "Invalid request body" });
  });
});
