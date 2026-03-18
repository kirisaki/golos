import { createMiddleware } from "hono/factory";
import { verifyJwt } from "../lib/jwt.js";
import type { Env } from "../index.js";

type AuthVars = {
  userId: string;
  walletAddress: string;
  displayName: string;
};

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: AuthVars;
}>(async (c, next) => {
  const header = c.req.header("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Missing authorization token" }, 401);
  }

  const token = header.slice(7);
  try {
    const payload = await verifyJwt(c.env.JWT_SECRET, token);
    c.set("userId", payload.sub);
    c.set("walletAddress", payload.wallet);
    c.set("displayName", payload.displayName);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
});
