'use client';

import * as React from 'react';
import { Navbar } from '@/components/navbar';

interface KeyStatus {
  groq: boolean;
  adzunaAppId: boolean;
  adzunaAppKey: boolean;
  rapidapi: boolean;
}

export default function SettingsPage() {
  const [status, setStatus] = React.useState<KeyStatus | null>(null);
  const [groqApiKey, setGroqApiKey] = React.useState('');
  const [adzunaAppId, setAdzunaAppId] = React.useState('');
  const [adzunaAppKey, setAdzunaAppKey] = React.useState('');
  const [rapidApiKey, setRapidApiKey] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/settings/keys')
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setError('Could not load your key status.'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);

    const payload: Record<string, string> = {};
    if (groqApiKey.trim()) payload.groqApiKey = groqApiKey.trim();
    if (adzunaAppId.trim()) payload.adzunaAppId = adzunaAppId.trim();
    if (adzunaAppKey.trim()) payload.adzunaAppKey = adzunaAppKey.trim();
    if (rapidApiKey.trim()) payload.rapidApiKey = rapidApiKey.trim();

    try {
      const res = await fetch('/api/settings/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save.');

      setMessage('Saved. Your keys are encrypted before storage.');
      setGroqApiKey('');
      setAdzunaAppId('');
      setAdzunaAppKey('');
      setRapidApiKey('');

      const refreshed = await fetch('/api/settings/keys').then((r) => r.json());
      setStatus(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  const StatusDot = ({ set }: { set: boolean | undefined }) => (
    <span className={`status-dot ${set ? 'healthy' : 'unhealthy'}`} style={{ marginRight: 'var(--sp-2)' }} />
  );

  return (
    <>
      <Navbar />

      <main className="mx-auto flex w-full max-w-[700px] flex-col gap-8 px-5 pb-20 pt-28 md:pt-32">
        <header>
          <p className="label mb-2">Settings</p>
          <h1 className="font-display text-3xl">Your API keys</h1>
          <p className="font-body mt-3" style={{ color: 'var(--body-text)' }}>
            Quorum runs entirely on your own free-tier keys. Nothing here touches
            this app&apos;s infrastructure or quota — your usage, your limits, your
            keys never shared with anyone else.
          </p>
        </header>

        <section className="card">
          <h2 className="font-display mb-4 text-xl">Groq (AI models)</h2>
          <p className="font-body mb-3 text-sm flex items-center" style={{ color: 'var(--body-text)' }}>
            <StatusDot set={status?.groq} />
            {status?.groq ? 'Key set' : 'Not set'} — used for resume analysis and email drafting.
          </p>
          <input
            type="password"
            className="input-field mb-2"
            placeholder="gsk_..."
            value={groqApiKey}
            onChange={(e) => setGroqApiKey(e.target.value)}
          />
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="label underline"
          >
            Get a free Groq key →
          </a>
        </section>

        <section className="card">
          <h2 className="font-display mb-4 text-xl">Adzuna (job search)</h2>
          <p className="font-body mb-3 text-sm flex items-center" style={{ color: 'var(--body-text)' }}>
            <StatusDot set={status?.adzunaAppId && status?.adzunaAppKey} />
            {status?.adzunaAppId && status?.adzunaAppKey ? 'Keys set' : 'Not set'}
          </p>
          <input
            className="input-field mb-2"
            placeholder="App ID"
            value={adzunaAppId}
            onChange={(e) => setAdzunaAppId(e.target.value)}
          />
          <input
            type="password"
            className="input-field mb-2"
            placeholder="App Key"
            value={adzunaAppKey}
            onChange={(e) => setAdzunaAppKey(e.target.value)}
          />
          <a
            href="https://developer.adzuna.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="label underline"
          >
            Get free Adzuna keys →
          </a>
        </section>

        <section className="card">
          <h2 className="font-display mb-4 text-xl">RapidAPI / JSearch (job search)</h2>
          <p className="font-body mb-3 text-sm flex items-center" style={{ color: 'var(--body-text)' }}>
            <StatusDot set={status?.rapidapi} />
            {status?.rapidapi ? 'Key set' : 'Not set'}
          </p>
          <input
            type="password"
            className="input-field mb-2"
            placeholder="RapidAPI key"
            value={rapidApiKey}
            onChange={(e) => setRapidApiKey(e.target.value)}
          />
          <a
            href="https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch"
            target="_blank"
            rel="noopener noreferrer"
            className="label underline"
          >
            Subscribe free on RapidAPI →
          </a>
        </section>

        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : 'Save keys'}
        </button>

        {message && <p className="font-body" style={{ color: 'var(--healthy)' }}>{message}</p>}
        {error && <p className="font-body" style={{ color: 'var(--unhealthy)' }}>{error}</p>}
      </main>
    </>
  );
}
