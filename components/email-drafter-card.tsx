'use client';

import * as React from 'react';

interface PhrasingScore {
  score: number;
  flags: string[];
}

interface DraftResult {
  subject: string;
  email: string;
  modelUsed: string;
  failoverEvents: { from: string; to: string; reason: string }[];
  phrasingScore: PhrasingScore;
}

export function EmailDrafterCard() {
  const [recipientName, setRecipientName] = React.useState('');
  const [companyName, setCompanyName] = React.useState('');
  const [role, setRole] = React.useState('');
  const [writingSample, setWritingSample] = React.useState('');
  const [context, setContext] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<DraftResult | null>(null);
  const [subjectDraft, setSubjectDraft] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [missingKeys, setMissingKeys] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const handleSubmit = async () => {
    if (!companyName.trim() || !role.trim()) {
      setError('Company name and role are required.');
      return;
    }
    setLoading(true);
    setError(null);
    setMissingKeys(false);
    setResult(null);

    try {
      const res = await fetch('/api/email/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientName, companyName, role, writingSample, context }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === 'missing_keys') {
          setMissingKeys(true);
          setError(data.error);
        } else {
          setError(data.error || 'Draft generation failed.');
        }
        return;
      }

      setResult(data);
      setSubjectDraft(data.subject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(`Subject: ${subjectDraft}\n\n${result.email}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const scoreColor = (score: number) => {
    if (score < 25) return 'var(--healthy)';
    if (score < 55) return '#d99a2b';
    return 'var(--unhealthy)';
  };

  return (
    <section id="email" className="card fade-in">
      <h2 className="font-display mb-1 text-2xl">Email drafter</h2>
      <p className="font-body mb-5" style={{ color: 'var(--body-text)' }}>
        Generate an outreach email in your own voice — no AI-sounding filler.
      </p>

      <div className="mb-3 grid gap-3 sm:grid-cols-2">
        <input
          className="input-field"
          placeholder="Recipient name (optional)"
          value={recipientName}
          onChange={(e) => setRecipientName(e.target.value)}
        />
        <input
          className="input-field"
          placeholder="Company name"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
        />
      </div>

      <input
        className="input-field mb-3"
        placeholder="Role you're applying for"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />

      <textarea
        className="textarea-field mb-3"
        placeholder="Paste a sample of your own writing, so the draft sounds like you (optional)"
        value={writingSample}
        onChange={(e) => setWritingSample(e.target.value)}
      />

      <textarea
        className="textarea-field mb-4"
        placeholder="Anything specific to mention — a project, a mutual connection, why this company (optional)"
        value={context}
        onChange={(e) => setContext(e.target.value)}
      />

      <button type="button" className="btn-primary" onClick={handleSubmit} disabled={loading}>
        {loading ? <span className="spinner" /> : 'Draft email'}
      </button>

      {error && !missingKeys && (
        <p className="font-body mt-3" style={{ color: 'var(--unhealthy)' }}>
          {error}
        </p>
      )}

      {missingKeys && (
        <p className="font-body mt-3" style={{ color: 'var(--unhealthy)' }}>
          {error}{' '}
          <a href="/dashboard/settings" className="underline">
            Go to Settings →
          </a>
        </p>
      )}

      {result && (
        <div className="fade-in mt-6" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 'var(--sp-5)' }}>
          <div className="mb-3 flex items-center justify-between">
            <p className="label">Answered by {result.modelUsed}</p>
            <button type="button" className="btn-outline" onClick={handleCopy}>
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>

          <label className="label mb-1 block">Subject</label>
          <input
            className="input-field mb-4"
            value={subjectDraft}
            onChange={(e) => setSubjectDraft(e.target.value)}
          />

          <label className="label mb-1 block">Body</label>
          <p className="font-body whitespace-pre-wrap">{result.email}</p>

          <div
            className="mt-5"
            style={{ borderTop: '1px solid var(--hairline)', paddingTop: 'var(--sp-4)' }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="label">Heuristic phrasing score</span>
              <span
                className="font-ui text-sm font-semibold"
                style={{ color: scoreColor(result.phrasingScore.score) }}
              >
                {result.phrasingScore.score}/100
              </span>
            </div>
            <p className="font-body text-sm" style={{ color: 'var(--body-text)' }}>
              Not a real AI-detector — no tool can reliably guarantee that. This
              checks for known AI-writing patterns (cliché phrases, uniform
              sentence length, formal connectors). Lower is more natural.
            </p>
            {result.phrasingScore.flags.length > 0 && (
              <ul className="font-body mt-2 text-sm" style={{ color: 'var(--body-text)' }}>
                {result.phrasingScore.flags.map((flag, i) => (
                  <li key={i}>· {flag}</li>
                ))}
              </ul>
            )}
          </div>

          {result.failoverEvents.length > 0 && (
            <p className="label mt-4">
              Failover: {result.failoverEvents.map((f) => `${f.from} → ${f.to}`).join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}