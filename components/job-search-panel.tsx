'use client';

import * as React from 'react';

interface Job {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salaryMin?: number;
  salaryMax?: number;
  posted: string;
  category: string;
  source?: 'adzuna' | 'jsearch';
}

type PublisherFilter = 'all' | 'linkedin' | 'indeed' | 'glassdoor';

const PUBLISHER_OPTIONS: { value: PublisherFilter; label: string }[] = [
  { value: 'all', label: 'All sources' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'indeed', label: 'Indeed' },
  { value: 'glassdoor', label: 'Glassdoor' },
];

export function JobSearchPanel() {
  const [query, setQuery] = React.useState('software engineer');
  const [location, setLocation] = React.useState('us');
  const [publisher, setPublisher] = React.useState<PublisherFilter>('all');
  const [jobs, setJobs] = React.useState<Job[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Builds the effective search query, appending "via <publisher>" when a
  // specific source is selected. JSearch documents this suffix as the
  // supported way to scope results to one publisher without a separate API.
  const buildEffectiveQuery = React.useCallback(
    (baseQuery: string, selectedPublisher: PublisherFilter) => {
      const trimmed = baseQuery.trim();
      if (selectedPublisher === 'all' || !trimmed) return trimmed;
      return `${trimmed} via ${selectedPublisher}`;
    },
    []
  );

  const runSearch = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const effectiveQuery = buildEffectiveQuery(query, publisher);
      const params = new URLSearchParams({ q: effectiveQuery, location, page: '1' });
      const res = await fetch(`/api/jobs/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Job search failed.');
      setJobs(data.jobs);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }, [query, location, publisher, buildEffectiveQuery]);

  React.useEffect(() => {
    runSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return null;
    const fmt = (n: number) => `$${Math.round(n / 1000)}k`;
    if (min && max) return `${fmt(min)}–${fmt(max)}`;
    return fmt(min || max || 0);
  };

  return (
    <section id="jobs" className="fade-in">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-2xl">Job search</h2>
        {jobs && <span className="label">{total} results</span>}
      </div>

      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <input
          className="input-field"
          placeholder="Role, e.g. frontend developer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
        />
        <input
          className="input-field sm:max-w-[140px]"
          placeholder="Country code"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
        />
      </div>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap gap-2">
          {PUBLISHER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPublisher(opt.value)}
              className={publisher === opt.value ? 'btn-primary' : 'btn-outline'}
              style={{ padding: 'var(--sp-2) var(--sp-4)', fontSize: '12px' }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="btn-primary whitespace-nowrap"
          onClick={runSearch}
          disabled={loading}
        >
          {loading ? <span className="spinner" /> : 'Search'}
        </button>
      </div>

      {publisher !== 'all' && (
        <p className="label mb-4">
          Filtering for {PUBLISHER_OPTIONS.find((o) => o.value === publisher)?.label} via JSearch's
          publisher scoping — results pulled through Google for Jobs, not scraped directly.
        </p>
      )}

      {error && (
        <p className="font-body" style={{ color: 'var(--unhealthy)' }}>
          {error}
        </p>
      )}

      {jobs && jobs.length === 0 && !loading && (
        <p className="font-body" style={{ color: 'var(--body-text)' }}>
          No results. Try a different role, location, or source.
        </p>
      )}

      <div className="flex flex-col">
        {jobs?.map((job, i) => (
          <a
            key={i}
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-ui flex flex-col gap-1 py-4 transition-opacity hover:opacity-70"
            style={{ borderBottom: '1px solid var(--hairline)' }}
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-display text-lg">{job.title}</span>
              {formatSalary(job.salaryMin, job.salaryMax) && (
                <span className="label">{formatSalary(job.salaryMin, job.salaryMax)}</span>
              )}
            </div>
            <p className="label">
              {job.company} · {job.location}
            </p>
            <p className="font-body text-sm" style={{ color: 'var(--body-text)' }}>
              {job.description}…
            </p>
          </a>
        ))}
      </div>
    </section>
  );
}