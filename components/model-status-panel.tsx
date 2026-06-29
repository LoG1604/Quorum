'use client';

import * as React from 'react';

interface ModelStatus {
  model: string;
  name: string;
  provider: string;
  healthy: boolean;
  configured: boolean;
  latencyMs: number;
  requestsToday: number;
  dailyLimit: number;
  requestsThisMinute: number;
  rpmLimit: number;
}

const POLL_INTERVAL_MS = 45_000;

export function ModelStatusPanel() {
  const [models, setModels] = React.useState<ModelStatus[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [collapsed, setCollapsed] = React.useState(true);

  const fetchStatus = React.useCallback(async () => {
    try {
      const res = await fetch('/api/models/status');
      if (!res.ok) throw new Error(`Status check failed: ${res.status}`);
      const data: ModelStatus[] = await res.json();
      setModels(data);
      setError(null);
    } catch {
      setError('Could not reach the model status endpoint.');
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const allHealthy = models?.every((m) => m.healthy) ?? false;

  return (
    <section id="status" className="fade-in">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Model status</h2>
        <span className="label">Live · refreshes every 45s</span>
      </div>

      {error && (
        <div className="card font-body" style={{ color: 'var(--unhealthy)' }}>
          {error}
        </div>
      )}

      {!error && !models && (
        <div className="card font-body flex items-center gap-3">
          <span className="spinner" />
          Checking model health…
        </div>
      )}

      {models && (
        <>
          {/* Mobile collapsed summary */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="card font-ui flex w-full items-center justify-between md:hidden"
          >
            <span className="flex items-center gap-2">
              <span className={`status-dot ${allHealthy ? 'healthy' : 'unhealthy'}`} />
              System status: {allHealthy ? 'all healthy' : 'degraded'}
            </span>
            <span className="label">{collapsed ? 'Show' : 'Hide'}</span>
          </button>

          <div
            className={`mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${collapsed ? 'hidden md:grid' : 'grid'
              }`}
          >
            {models.map((m) => {
              const dayPct = Math.min(100, (m.requestsToday / m.dailyLimit) * 100);
              const minPct = Math.min(100, (m.requestsThisMinute / m.rpmLimit) * 100);
              return (
                <div key={m.model} className="card">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-ui text-sm font-semibold">{m.name}</span>
                    <span
                      className={`status-dot ${!m.configured ? '' : m.healthy ? 'healthy' : 'unhealthy'
                        }`}
                      style={!m.configured ? { background: 'var(--body-text)' } : undefined}
                      title={!m.configured ? 'No Groq key configured' : m.healthy ? 'Healthy' : 'Unreachable'}
                    />
                  </div>
                  <p className="label mb-3">
                    {m.provider} ·{' '}
                    {!m.configured ? (
                      <a href="/dashboard/settings" className="underline">
                        Add your Groq key
                      </a>
                    ) : (
                      `${m.latencyMs}ms`
                    )}
                  </p>

                  <div className="mb-2">
                    <div className="label mb-1 flex justify-between">
                      <span>Today</span>
                      <span>
                        {m.requestsToday} / {m.dailyLimit}
                      </span>
                    </div>
                    <div className="usage-bar-track">
                      <div className="usage-bar-fill" style={{ width: `${dayPct}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="label mb-1 flex justify-between">
                      <span>This minute</span>
                      <span>
                        {m.requestsThisMinute} / {m.rpmLimit}
                      </span>
                    </div>
                    <div className="usage-bar-track">
                      <div className="usage-bar-fill" style={{ width: `${minPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}