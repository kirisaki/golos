import { Hono } from "hono";
import type { Env } from "../index.js";
import { GoogleOAuthProvider } from "../lib/oauth.js";
import { generateWallet, encryptPrivateKey } from "../lib/custody.js";
import { issueJwt } from "../lib/jwt.js";

const auth = new Hono<{ Bindings: Env }>();

auth.get("/auth/google", async (c) => {
  const state = crypto.randomUUID();
  const referer = c.req.header("Referer");
  const refererUrl = referer ? new URL(referer) : null;
  const origin = refererUrl?.origin ?? c.env.ALLOWED_ORIGINS.split(",")[0].trim();
  const lang = refererUrl?.pathname.startsWith("/en") ? "en" : "ja";
  await c.env.RATE_LIMIT.put(`oauth_state:${state}`, JSON.stringify({ origin, lang }), { expirationTtl: 300 });

  const provider = new GoogleOAuthProvider(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    c.env.GOOGLE_REDIRECT_URI,
  );
  return c.redirect(provider.getAuthorizationUrl(state));
});

auth.get("/auth/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");

  if (!code || !state) {
    return c.json({ error: "Missing code or state" }, 400);
  }

  // Validate and consume state (value is JSON with origin and lang)
  const stateData = await c.env.RATE_LIMIT.get(`oauth_state:${state}`);
  if (!stateData) {
    return c.json({ error: "Invalid or expired state" }, 400);
  }
  await c.env.RATE_LIMIT.delete(`oauth_state:${state}`);
  const { origin: frontendOrigin, lang } = JSON.parse(stateData) as { origin: string; lang: string };

  // Exchange code for user info
  const provider = new GoogleOAuthProvider(
    c.env.GOOGLE_CLIENT_ID,
    c.env.GOOGLE_CLIENT_SECRET,
    c.env.GOOGLE_REDIRECT_URI,
  );

  let userInfo;
  try {
    userInfo = await provider.exchangeCode(code);
  } catch (e: any) {
    console.error("OAuth exchange failed:", e.message);
    return c.json({ error: "Authentication failed" }, 500);
  }

  // Look up existing oauth account
  const existing = await c.env.DB.prepare(
    "SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_account_id = ?",
  )
    .bind("google", userInfo.providerAccountId)
    .first<{ user_id: string }>();

  let userId: string;
  let walletAddress: string;

  if (existing) {
    userId = existing.user_id;
    const user = await c.env.DB.prepare(
      "SELECT wallet_address, display_name FROM users WHERE id = ?",
    )
      .bind(userId)
      .first<{ wallet_address: string; display_name: string }>();

    if (!user) {
      return c.json({ error: "User not found" }, 500);
    }
    walletAddress = user.wallet_address;

    // Update display name and avatar if changed
    await c.env.DB.prepare(
      "UPDATE users SET display_name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?",
    )
      .bind(userInfo.displayName, userInfo.avatarUrl ?? null, userId)
      .run();
  } else {
    // Create new user with custodial wallet
    userId = crypto.randomUUID();
    const wallet = generateWallet();
    walletAddress = wallet.address;
    const encryptedKey = await encryptPrivateKey(
      wallet.privateKey,
      c.env.WALLET_ENCRYPTION_KEY,
    );

    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO users (id, wallet_address, encrypted_private_key, display_name, avatar_url) VALUES (?, ?, ?, ?, ?)",
      ).bind(userId, walletAddress, encryptedKey, userInfo.displayName, userInfo.avatarUrl ?? null),
      c.env.DB.prepare(
        "INSERT INTO oauth_accounts (provider, provider_account_id, user_id, email) VALUES (?, ?, ?, ?)",
      ).bind("google", userInfo.providerAccountId, userId, userInfo.email),
    ]);
  }

  const token = await issueJwt(
    c.env.JWT_SECRET,
    userId,
    walletAddress,
    userInfo.displayName,
  );

  const redirectUrl = new URL(`/${lang}/auth/callback`, frontendOrigin);
  redirectUrl.searchParams.set("token", token);
  return c.redirect(redirectUrl.toString());
});

export default auth;
