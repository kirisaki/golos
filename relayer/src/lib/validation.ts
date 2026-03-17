import { isAddress, isHex } from "viem";

const MAX_CONTENT_BYTES = 5120;

export type CommentRequest = {
  author: string;
  postSlug: string;
  username: string;
  content: string;
  signature: string;
};

export function validateCommentRequest(body: unknown): {
  ok: true;
  data: CommentRequest;
} | {
  ok: false;
  error: string;
} {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Invalid request body" };
  }

  const { author, postSlug, username, content, signature } = body as Record<string, unknown>;

  if (typeof author !== "string" || !isAddress(author)) {
    return { ok: false, error: "Invalid author address" };
  }

  if (typeof postSlug !== "string" || postSlug.length === 0) {
    return { ok: false, error: "postSlug is required" };
  }

  if (typeof username !== "string" || username.length === 0) {
    return { ok: false, error: "username is required" };
  }

  if (typeof content !== "string" || content.length === 0) {
    return { ok: false, error: "content is required" };
  }

  if (new TextEncoder().encode(content).length > MAX_CONTENT_BYTES) {
    return { ok: false, error: "content exceeds 5120 bytes" };
  }

  if (typeof signature !== "string" || !isHex(signature)) {
    return { ok: false, error: "Invalid signature" };
  }

  return { ok: true, data: { author, postSlug, username, content, signature } };
}
