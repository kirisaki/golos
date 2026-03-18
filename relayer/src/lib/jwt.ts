import { sign, verify } from "hono/jwt";

const EXPIRY_SECONDS = 7 * 24 * 60 * 60; // 7 days

export type JwtPayload = {
  sub: string;
  wallet: string;
  displayName: string;
  iat: number;
  exp: number;
};

export async function issueJwt(
  secret: string,
  userId: string,
  walletAddress: string,
  displayName: string,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: userId, wallet: walletAddress, displayName, iat: now, exp: now + EXPIRY_SECONDS },
    secret,
  );
}

export async function verifyJwt(
  secret: string,
  token: string,
): Promise<JwtPayload> {
  const payload = await verify(token, secret, "HS256");
  return payload as unknown as JwtPayload;
}
