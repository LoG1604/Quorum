import Groq from 'groq-sdk';
import { MODEL_REGISTRY, getModelCounters } from '@/lib/groq';
import { getUserApiKeys } from '@/lib/user-keys';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET() {
  const userResult = await getUserApiKeys();
  if (!userResult) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }

  const apiKey = userResult.keys.groqApiKey;

  if (!apiKey) {
    // No key configured yet — don't waste a network call pinging with an
    // empty key, and don't report this as "unhealthy" (that implies the
    // model is down, when really the user just hasn't added a key yet).
    const results = MODEL_REGISTRY.map((model) => ({
      model: model.id,
      name: model.name,
      provider: model.provider,
      healthy: false,
      configured: false,
      latencyMs: 0,
      requestsToday: 0,
      dailyLimit: model.rpdLimit,
      requestsThisMinute: 0,
      rpmLimit: model.rpmLimit,
    }));
    return Response.json(results);
  }

  const groq = new Groq({ apiKey });

  const results = await Promise.all(
    MODEL_REGISTRY.map(async (model) => {
      const start = Date.now();
      let healthy = false;
      let latencyMs = 0;

      try {
        await groq.chat.completions.create({
          model: model.id,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        });
        healthy = true;
        latencyMs = Date.now() - start;
      } catch {
        latencyMs = Date.now() - start;
        healthy = false;
      }

      const counters = await getModelCounters(userResult.userId, model.id);

      return {
        model: model.id,
        name: model.name,
        provider: model.provider,
        healthy,
        configured: true,
        latencyMs,
        requestsToday: counters.requestsToday,
        dailyLimit: model.rpdLimit,
        requestsThisMinute: counters.requestsThisMinute,
        rpmLimit: model.rpmLimit,
      };
    })
  );

  return Response.json(results);
}