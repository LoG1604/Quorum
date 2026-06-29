import Groq from 'groq-sdk';
import { redis } from './redis';
import { createServiceRoleClient } from './supabase';

// ─── Live model registry ──────────────────────────────────────────────────
export const MODEL_REGISTRY = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B',
    provider: 'Meta',
    rpmLimit: 1000,
    rpdLimit: 14400,
    contextWindow: 131072,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    provider: 'OpenAI',
    rpmLimit: 1000,
    rpdLimit: 14400,
    contextWindow: 131072,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B',
    provider: 'Meta',
    rpmLimit: 1000,
    rpdLimit: 14400,
    contextWindow: 131072,
  },
] as const;

export type ModelId = (typeof MODEL_REGISTRY)[number]['id'];

export const DEFAULT_MODEL_PRIORITY: ModelId[] = [
  'llama-3.3-70b-versatile',
  'openai/gpt-oss-120b',
  'llama-3.1-8b-instant',
];

// ─── Redis-backed rate-limit counters, scoped per user ────────────────────
// Each user brings their own Groq key, so their rate-limit window is theirs
// alone — counters must never be shared across users.

function rpmKey(userId: string, model: string) {
  const minute = Math.floor(Date.now() / 60_000);
  return `groq:rpm:${userId}:${model}:${minute}`;
}
function rpdKey(userId: string, model: string) {
  const day = new Date().toISOString().slice(0, 10);
  return `groq:rpd:${userId}:${model}:${day}`;
}

const memCounters: Record<string, number> = {};
function getMemCount(key: string): number {
  return memCounters[key] ?? 0;
}
function incrMem(key: string) {
  memCounters[key] = (memCounters[key] ?? 0) + 1;
}

async function checkRateLimit(
  userId: string,
  modelId: string,
  rpmLimit: number,
  rpdLimit: number
): Promise<boolean> {
  if (redis) {
    const rpm = rpmKey(userId, modelId);
    const rpd = rpdKey(userId, modelId);
    const [currentRpm, currentRpd] = await Promise.all([
      redis.get<number>(rpm),
      redis.get<number>(rpd),
    ]);
    if ((currentRpm ?? 0) >= rpmLimit) return false;
    if ((currentRpd ?? 0) >= rpdLimit) return false;
    return true;
  }
  if (getMemCount(rpmKey(userId, modelId)) >= rpmLimit) return false;
  if (getMemCount(rpdKey(userId, modelId)) >= rpdLimit) return false;
  return true;
}

async function incrementRateCounters(userId: string, modelId: string): Promise<void> {
  if (redis) {
    const rpm = rpmKey(userId, modelId);
    const rpd = rpdKey(userId, modelId);
    await Promise.all([
      redis.incr(rpm).then(() => redis!.expire(rpm, 60)),
      redis.incr(rpd).then(() => redis!.expire(rpd, 86400)),
    ]);
  } else {
    incrMem(rpmKey(userId, modelId));
    incrMem(rpdKey(userId, modelId));
  }
}

export async function getModelCounters(userId: string, modelId: string) {
  if (redis) {
    const [currentRpm, currentRpd] = await Promise.all([
      redis.get<number>(rpmKey(userId, modelId)),
      redis.get<number>(rpdKey(userId, modelId)),
    ]);
    return { requestsThisMinute: currentRpm ?? 0, requestsToday: currentRpd ?? 0 };
  }
  return {
    requestsThisMinute: getMemCount(rpmKey(userId, modelId)),
    requestsToday: getMemCount(rpdKey(userId, modelId)),
  };
}

// ─── Failover logging, attributed to the user whose key triggered it ─────

async function logFailover(userId: string, fromModel: string, toModel: string, reason: string) {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from('failover_logs').insert({
      user_id: userId,
      from_model: fromModel,
      to_model: toModel,
      reason,
    });
  } catch (e) {
    console.error('Failed to log failover event:', e);
  }
}

// ─── Main wrapper — now takes the caller's own Groq key and user id ──────

export interface ModelCallResult {
  text: string;
  modelUsed: ModelId;
  failoverEvents: { from: string; to: string; reason: string }[];
}

export async function callModelWithFallback(
  prompt: string,
  apiKey: string,
  userId: string,
  systemPrompt?: string,
  modelPriorityList: ModelId[] = DEFAULT_MODEL_PRIORITY
): Promise<ModelCallResult> {
  const groq = new Groq({ apiKey });
  const failoverEvents: { from: string; to: string; reason: string }[] = [];

  for (let i = 0; i < modelPriorityList.length; i++) {
    const modelId = modelPriorityList[i];
    const config = MODEL_REGISTRY.find((m) => m.id === modelId);
    if (!config) continue;

    const allowed = await checkRateLimit(userId, modelId, config.rpmLimit, config.rpdLimit);
    if (!allowed) {
      const reason = 'Rate limit already hit, skipping without API call';
      console.warn(`[groq] ${modelId}: ${reason}`);
      if (i + 1 < modelPriorityList.length) {
        const nextModel = modelPriorityList[i + 1];
        failoverEvents.push({ from: modelId, to: nextModel, reason });
        await logFailover(userId, modelId, nextModel, reason);
      }
      continue;
    }

    try {
      const messages: { role: 'system' | 'user'; content: string }[] = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const completion = await groq.chat.completions.create({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
      });

      await incrementRateCounters(userId, modelId);

      const text = completion.choices?.[0]?.message?.content ?? '';
      return { text, modelUsed: modelId, failoverEvents };
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      const is429 = err.status === 429;
      const is401 = err.status === 401;
      const isTimeout = err.message?.includes('timeout') || err.message?.includes('ETIMEDOUT');
      const reason = is401
        ? 'Invalid or missing Groq API key'
        : is429
          ? '429 Too Many Requests'
          : isTimeout
            ? 'Request timeout'
            : `Error: ${err.message ?? 'Unknown'}`;

      console.error(`[groq] ${modelId} failed: ${reason}`);

      if (i + 1 < modelPriorityList.length) {
        const nextModel = modelPriorityList[i + 1];
        failoverEvents.push({ from: modelId, to: nextModel, reason });
        await logFailover(userId, modelId, nextModel, reason);
      }
    }
  }

  throw new Error(
    `All models exhausted. Tried: ${modelPriorityList.join(', ')}. Events: ${JSON.stringify(failoverEvents)}`
  );
}