import { RateLimiterRedis, RateLimiterMemory, IRateLimiterOptions } from "rate-limiter-flexible";
import IORedis from "ioredis";

// --- Redis-backed Rate Limiting ---
// In-memory resets on every serverless cold start (useless on Vercel).
// Redis-backed persists across function invocations.
// Falls back to in-memory if Redis unavailable.

let redis: IORedis | null = null;
try {
  if (process.env.REDIS_URL) {
    redis = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      connectTimeout: 3000,
      enableOfflineQueue: false,
    });
  }
} catch {
  console.warn("[ratelimit] Redis connection failed, falling back to in-memory");
}

function createLimiter(opts: IRateLimiterOptions & { keyPrefix: string }) {
  if (redis) {
    return new RateLimiterRedis({ ...opts, storeClient: redis });
  }
  return new RateLimiterMemory(opts);
}

// Per-user: max 50 redemptions per hour
export const userRedemptionLimiter = createLimiter({
  keyPrefix: "redeem-user",
  points: 50,
  duration: 3600,
});

// Per-collection-point: max 200 redemptions per hour
export const collectionPointLimiter = createLimiter({
  keyPrefix: "redeem-cp",
  points: 200,
  duration: 3600,
});

// Per-serial: exactly 1 attempt per 10 seconds (prevents rapid retry on same code)
export const serialLimiter = createLimiter({
  keyPrefix: "redeem-serial",
  points: 1,
  duration: 10,
});

// QR generation: max 10,000 codes per brand per hour via sync API
export const generationLimiter = createLimiter({
  keyPrefix: "gen-brand",
  points: 10000,
  duration: 3600,
});

export async function checkRedemptionLimits(params: {
  userId: string;
  serial: string;
  collectionPointId?: string;
}): Promise<{ allowed: boolean; error?: string }> {
  try {
    await serialLimiter.consume(params.serial);
  } catch {
    return { allowed: false, error: "Too many attempts on this code. Wait 10 seconds." };
  }

  try {
    await userRedemptionLimiter.consume(params.userId);
  } catch {
    return { allowed: false, error: "Redemption limit exceeded (50/hour). Try again later." };
  }

  if (params.collectionPointId) {
    try {
      await collectionPointLimiter.consume(params.collectionPointId);
    } catch {
      return { allowed: false, error: "Collection point limit exceeded (200/hour)." };
    }
  }

  return { allowed: true };
}

export async function checkGenerationLimit(brandId: string): Promise<{ allowed: boolean; error?: string }> {
  try {
    await generationLimiter.consume(brandId);
    return { allowed: true };
  } catch {
    return { allowed: false, error: "Generation limit exceeded (10,000/hour). Use batch API." };
  }
}
