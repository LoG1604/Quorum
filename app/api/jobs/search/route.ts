import https from 'node:https';
import { resolve4 } from 'node:dns/promises';
import { getUserApiKeys } from '@/lib/user-keys';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// ─── Shared connection helper for Adzuna (AWS-hosted, needs single-IP ────
// connection on some networks to avoid multi-address connection timeouts) ─

async function httpGetJson(
  hostname: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; json: any }> {
  const addresses = await resolve4(hostname);
  const ip = addresses[0];

  const { status, body } = await new Promise<{ status: number; body: string }>(
    (resolveResponse, reject) => {
      const req = https
        .get(
          {
            host: ip,
            path,
            headers: { Host: hostname, ...headers },
            servername: hostname,
            timeout: 10000,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => resolveResponse({ status: res.statusCode ?? 500, body: data }));
          }
        )
        .on('error', reject);

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request to ${hostname} timed out`));
      });
    }
  );

  let json: any;
  try {
    json = JSON.parse(body);
  } catch {
    json = { raw: body };
  }
  return { status, json };
}

interface NormalizedJob {
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  salaryMin?: number;
  salaryMax?: number;
  posted: string;
  category: string;
  source: 'adzuna' | 'jsearch';
}

// ─── Adzuna source ──────────────────────────────────────────────────────────

interface AdzunaJob {
  title: string;
  description: string;
  redirect_url: string;
  company: { display_name: string };
  location: { display_name: string };
  salary_min?: number;
  salary_max?: number;
  created: string;
  category?: { label: string };
}

async function fetchAdzuna(
  query: string,
  country: string,
  page: string,
  appId?: string,
  appKey?: string
): Promise<NormalizedJob[]> {
  if (!appId || !appKey) {
    console.warn('[jobs] No Adzuna keys for this user, skipping this source.');
    return [];
  }

  const path = `/v1/api/jobs/${country}/search/${page}?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${encodeURIComponent(query)}&content-type=application/json`;

  const { status, json } = await httpGetJson('api.adzuna.com', path);
  if (status < 200 || status >= 300) {
    console.error('[jobs] Adzuna error:', status, json);
    return [];
  }

  return (json.results || []).map((job: AdzunaJob) => ({
    title: job.title,
    company: job.company?.display_name || 'Unknown',
    location: job.location?.display_name || 'Remote',
    description: (job.description || '').slice(0, 300),
    url: job.redirect_url,
    salaryMin: job.salary_min,
    salaryMax: job.salary_max,
    posted: job.created,
    category: job.category?.label || '',
    source: 'adzuna' as const,
  }));
}

// ─── JSearch source ─────────────────────────────────────────────────────────

interface JSearchJob {
  job_title: string;
  employer_name?: string;
  job_city?: string;
  job_state?: string;
  job_country?: string;
  job_description?: string;
  job_apply_link: string;
  job_min_salary?: number;
  job_max_salary?: number;
  job_posted_at_datetime_utc?: string;
  job_employment_type?: string;
}

async function fetchJSearch(
  query: string,
  country: string,
  apiKey?: string
): Promise<NormalizedJob[]> {
  if (!apiKey) {
    console.warn('[jobs] No RapidAPI key for this user, skipping JSearch source.');
    return [];
  }

  const params = new URLSearchParams({
    query,
    page: '1',
    num_pages: '1',
    country,
    date_posted: 'month',
  });

  // Plain fetch — RapidAPI is CDN-routed by Host header, so the direct-IP
  // helper used for Adzuna would land on the wrong edge node here.
  const res = await fetch(`https://jsearch.p.rapidapi.com/search-v2?${params.toString()}`, {
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
    },
  });

  const json: any = await res.json();

  if (!res.ok) {
    console.error('[jobs] JSearch error:', res.status, json);
    return [];
  }

  const results: JSearchJob[] = Array.isArray(json.data)
    ? json.data
    : Array.isArray(json.data?.jobs)
      ? json.data.jobs
      : Array.isArray(json)
        ? json
        : [];

  return results.map((job) => {
    const locationParts = [job.job_city, job.job_state, job.job_country].filter(Boolean);
    return {
      title: job.job_title,
      company: job.employer_name || 'Unknown',
      location: locationParts.length ? locationParts.join(', ') : 'Remote',
      description: (job.job_description || '').slice(0, 300),
      url: job.job_apply_link,
      salaryMin: job.job_min_salary,
      salaryMax: job.job_max_salary,
      posted: job.job_posted_at_datetime_utc || new Date().toISOString(),
      category: job.job_employment_type || '',
      source: 'jsearch' as const,
    };
  });
}

// ─── Dedupe + merge ───────────────────────────────────────────────────────────

function dedupeAndSort(jobs: NormalizedJob[]): NormalizedJob[] {
  const seen = new Set<string>();
  const unique: NormalizedJob[] = [];

  for (const job of jobs) {
    const key = `${job.title.toLowerCase().trim()}|${job.company.toLowerCase().trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(job);
    }
  }

  return unique.sort((a, b) => {
    const dateA = new Date(a.posted).getTime() || 0;
    const dateB = new Date(b.posted).getTime() || 0;
    return dateB - dateA;
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const userResult = await getUserApiKeys();
    if (!userResult) {
      return Response.json({ error: 'Not authenticated.' }, { status: 401 });
    }

    const hasAdzuna = !!(userResult.keys.adzunaAppId && userResult.keys.adzunaAppKey);
    const hasJSearch = !!userResult.keys.rapidApiKey;

    if (!hasAdzuna && !hasJSearch) {
      return Response.json(
        {
          error: 'Add an Adzuna or RapidAPI key in Settings to search for jobs.',
          code: 'missing_keys',
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || 'software engineer';
    const location = searchParams.get('location') || 'us';
    const page = searchParams.get('page') || '1';
    const country = location.toLowerCase().slice(0, 2) || 'us';

    const [adzunaResult, jsearchResult] = await Promise.allSettled([
      fetchAdzuna(query, country, page, userResult.keys.adzunaAppId, userResult.keys.adzunaAppKey),
      fetchJSearch(query, country, userResult.keys.rapidApiKey),
    ]);

    const adzunaJobs = adzunaResult.status === 'fulfilled' ? adzunaResult.value : [];
    const jsearchJobs = jsearchResult.status === 'fulfilled' ? jsearchResult.value : [];

    if (adzunaResult.status === 'rejected') {
      console.error('[jobs] Adzuna source failed entirely:', adzunaResult.reason);
    }
    if (jsearchResult.status === 'rejected') {
      console.error('[jobs] JSearch source failed entirely:', jsearchResult.reason);
    }

    const merged = dedupeAndSort([...jsearchJobs, ...adzunaJobs]);

    if (
      merged.length === 0 &&
      adzunaResult.status === 'rejected' &&
      jsearchResult.status === 'rejected'
    ) {
      return Response.json(
        { error: 'Both job sources are unavailable right now. Please try again shortly.' },
        { status: 503 }
      );
    }

    return Response.json({
      jobs: merged,
      total: merged.length,
      page: Number(page),
      sources: {
        adzuna: adzunaJobs.length,
        jsearch: jsearchJobs.length,
      },
    });
  } catch (error) {
    console.error('Job search error:', error);
    return Response.json(
      { error: 'Failed to search jobs. Please try again.' },
      { status: 500 }
    );
  }
}