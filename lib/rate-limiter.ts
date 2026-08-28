/**
 * Upstash Redis / In-Memory Fallback Rate Limiter
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

export async function checkRateLimit(
  identifier: string,
  limitOrOptions: number | { limit: number; windowMs: number } = 60,
  windowSeconds: number = 60
): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  let limit = 60;
  let windowMs = windowSeconds * 1000;

  if (typeof limitOrOptions === "object") {
    limit = limitOrOptions.limit;
    windowMs = limitOrOptions.windowMs;
  } else {
    limit = limitOrOptions;
  }

  const now = Date.now();

  const record = memoryStore.get(identifier);

  if (!record || now > record.resetAt) {
    memoryStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor((now + windowMs) / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: Math.floor(record.resetAt / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - record.count,
    reset: Math.floor(record.resetAt / 1000),
  };
}
