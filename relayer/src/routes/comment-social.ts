import { Hono } from "hono";
import type { Hex } from "viem";
import { BaseError, ContractFunctionRevertedError } from "viem";
import type { Env } from "../index.js";
import { authMiddleware } from "../middleware/auth.js";
import { decryptPrivateKey, signComment } from "../lib/custody.js";
import { resolveEnsName, slugToPostId, submitComment } from "../lib/contract.js";
import { checkUserRateLimit } from "../lib/ratelimit.js";

const commentSocial = new Hono<{
  Bindings: Env;
  Variables: { userId: string; walletAddress: string; displayName: string };
}>();

commentSocial.post("/comment/social", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const walletAddress = c.get("walletAddress") as Hex;
  const displayName = c.get("displayName");

  // Rate limit by userId
  const allowed = await checkUserRateLimit(c.env.RATE_LIMIT, userId);
  if (!allowed) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const body = await c.req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const { postSlug, content } = body as Record<string, unknown>;

  if (typeof postSlug !== "string" || postSlug.length === 0) {
    return c.json({ error: "postSlug is required" }, 400);
  }
  if (typeof content !== "string" || content.length === 0) {
    return c.json({ error: "content is required" }, 400);
  }
  if (new TextEncoder().encode(content).length > 5120) {
    return c.json({ error: "content exceeds 5120 bytes" }, 400);
  }

  // Fetch user's encrypted private key from D1
  const user = await c.env.DB.prepare(
    "SELECT encrypted_private_key FROM users WHERE id = ?",
  )
    .bind(userId)
    .first<{ encrypted_private_key: string }>();

  if (!user) {
    return c.json({ error: "User not found" }, 500);
  }

  let custodialKey: Hex;
  try {
    custodialKey = (await decryptPrivateKey(
      user.encrypted_private_key,
      c.env.WALLET_ENCRYPTION_KEY,
    )) as Hex;
  } catch {
    return c.json({ error: "Failed to decrypt wallet key" }, 500);
  }

  const postId = slugToPostId(postSlug);
  const username = displayName;

  // Sign the comment with the custodial wallet
  const signature = await signComment(
    custodialKey,
    walletAddress,
    postId,
    username,
    content,
  );

  // Resolve ENS (will be empty for custodial wallets)
  const ensName = c.env.ENS_RPC_URL
    ? await resolveEnsName(c.env.ENS_RPC_URL, walletAddress)
    : "";

  try {
    const txHash = await submitComment(
      c.env,
      walletAddress,
      postSlug,
      username,
      ensName,
      content,
      signature,
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

export default commentSocial;
