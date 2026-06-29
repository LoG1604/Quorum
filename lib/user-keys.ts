import { auth } from '@clerk/nextjs/server';
import { createServiceRoleClient } from './supabase';
import { encrypt, decrypt } from './encryption';

export interface UserApiKeys {
  groqApiKey?: string;
  adzunaAppId?: string;
  adzunaAppKey?: string;
  rapidApiKey?: string;
}

export interface UserApiKeysResult {
  userId: string;
  keys: UserApiKeys;
}

interface UserApiKeysRow {
  user_id: string;
  groq_api_key_encrypted: string | null;
  adzuna_app_id_encrypted: string | null;
  adzuna_app_key_encrypted: string | null;
  rapidapi_key_encrypted: string | null;
}

function safeDecrypt(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    return decrypt(value);
  } catch (err) {
    console.error('[user-keys] Failed to decrypt a stored key — treating as unset:', err);
    return undefined;
  }
}

/**
 * Returns the signed-in user's decrypted API keys, or null if nobody is
 * signed in. Any key the user hasn't set yet is simply undefined.
 */
export async function getUserApiKeys(): Promise<UserApiKeysResult | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[user-keys] Failed to load keys for user:', error);
  }

  const row = data as UserApiKeysRow | null;

  if (!row) {
    return { userId, keys: {} };
  }

  return {
    userId,
    keys: {
      groqApiKey: safeDecrypt(row.groq_api_key_encrypted),
      adzunaAppId: safeDecrypt(row.adzuna_app_id_encrypted),
      adzunaAppKey: safeDecrypt(row.adzuna_app_key_encrypted),
      rapidApiKey: safeDecrypt(row.rapidapi_key_encrypted),
    },
  };
}

/**
 * Saves any provided keys for the signed-in user. Fields left undefined are
 * not touched — pass an empty string explicitly to clear a key.
 */
export async function saveUserApiKeys(partial: UserApiKeys): Promise<void> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Not authenticated.');
  }

  const supabase = createServiceRoleClient();

  const update: Record<string, string> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (partial.groqApiKey !== undefined) {
    update.groq_api_key_encrypted = partial.groqApiKey ? encrypt(partial.groqApiKey) : '';
  }
  if (partial.adzunaAppId !== undefined) {
    update.adzuna_app_id_encrypted = partial.adzunaAppId ? encrypt(partial.adzunaAppId) : '';
  }
  if (partial.adzunaAppKey !== undefined) {
    update.adzuna_app_key_encrypted = partial.adzunaAppKey ? encrypt(partial.adzunaAppKey) : '';
  }
  if (partial.rapidApiKey !== undefined) {
    update.rapidapi_key_encrypted = partial.rapidApiKey ? encrypt(partial.rapidApiKey) : '';
  }

  const { error } = await supabase.from('user_api_keys').upsert(update);
  if (error) {
    throw new Error(`Failed to save API keys: ${error.message}`);
  }
}

/**
 * Returns which keys are set (booleans only) — safe to send to the client,
 * since it never includes the actual decrypted secret values.
 */
export async function getUserApiKeyStatus(): Promise<{
  groq: boolean;
  adzunaAppId: boolean;
  adzunaAppKey: boolean;
  rapidapi: boolean;
} | null> {
  const result = await getUserApiKeys();
  if (!result) return null;
  return {
    groq: !!result.keys.groqApiKey,
    adzunaAppId: !!result.keys.adzunaAppId,
    adzunaAppKey: !!result.keys.adzunaAppKey,
    rapidapi: !!result.keys.rapidApiKey,
  };
}
