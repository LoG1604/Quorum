import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

// Initialize Upstash Redis client only if URL and token are provided.
// If not, we log a warning but export null so the application does not crash
// and can fall back to simplified local mock storage in development.
export const redis = redisUrl && redisToken
  ? new Redis({ url: redisUrl, token: redisToken })
  : null;

if (!redis) {
  console.warn(
    'Warning: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Rate-limit tracking will fall back to in-memory tracking.'
  );
}
