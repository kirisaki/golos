const COOLDOWN_SECONDS = 60;

export async function checkRateLimit(
  kv: KVNamespace,
  ip: string,
): Promise<boolean> {
  const key = `ratelimit:${ip}`;
  const existing = await kv.get(key);
  if (existing !== null) {
    return false;
  }
  await kv.put(key, "1", { expirationTtl: COOLDOWN_SECONDS });
  return true;
}

export async function checkUserRateLimit(
  kv: KVNamespace,
  userId: string,
): Promise<boolean> {
  const key = `ratelimit:user:${userId}`;
  const existing = await kv.get(key);
  if (existing !== null) {
    return false;
  }
  await kv.put(key, "1", { expirationTtl: COOLDOWN_SECONDS });
  return true;
}
