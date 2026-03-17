import { Hono } from "hono";
import type { Hex } from "viem";
import { submitComment } from "../lib/contract.js";
import { checkRateLimit } from "../lib/ratelimit.js";
import { validateCommentRequest } from "../lib/validation.js";
import type { Env } from "../index.js";
import { BaseError, ContractFunctionRevertedError } from "viem";

const comment = new Hono<{ Bindings: Env }>();

comment.post("/comment", async (c) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";

  const allowed = await checkRateLimit(c.env.RATE_LIMIT, ip);
  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const body = await c.req.json().catch(() => null);
  const result = validateCommentRequest(body);
  if (!result.ok) {
    return c.json({ error: result.error }, 400);
  }

  const { author, postSlug, username, content, signature } = result.data;

  try {
    const txHash = await submitComment(
      c.env,
      author as Hex,
      postSlug,
      username,
      content,
      signature as Hex,
    );
    return c.json({ txHash });
  } catch (e) {
    if (e instanceof BaseError) {
      const revertError = e.walk(
        (err) => err instanceof ContractFunctionRevertedError,
      );
      if (revertError instanceof ContractFunctionRevertedError) {
        const reason = revertError.data?.errorName ?? revertError.shortMessage;
        return c.json({ error: `Contract reverted: ${reason}` }, 400);
      }
    }

    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("submitComment failed:", message);
    return c.json({ error: "Transaction failed" }, 500);
  }
});

export default comment;
