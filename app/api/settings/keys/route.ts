import { getUserApiKeyStatus, saveUserApiKeys } from '@/lib/user-keys';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = await getUserApiKeyStatus();
  if (!status) {
    return Response.json({ error: 'Not authenticated.' }, { status: 401 });
  }
  return Response.json(status);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { groqApiKey, adzunaAppId, adzunaAppKey, rapidApiKey } = body;

    await saveUserApiKeys({
      groqApiKey,
      adzunaAppId,
      adzunaAppKey,
      rapidApiKey,
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to save API keys:', error);
    const message = error instanceof Error ? error.message : 'Failed to save keys.';
    return Response.json({ error: message }, { status: 500 });
  }
}
