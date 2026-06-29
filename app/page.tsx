import Link from 'next/link';
import { Show, SignUpButton } from '@clerk/nextjs';
import { Navbar } from '@/components/navbar';

export default function Home() {
  return (
    <>
      <Navbar />

      <main className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-8 px-5 pb-20 pt-32 text-center md:pt-40">
        <p className="label">Job application assistant</p>

        <h1 className="font-display text-4xl leading-tight md:text-5xl">
          One dashboard. Every model has your back.
        </h1>

        <p className="font-body max-w-xl" style={{ color: 'var(--body-text)' }}>
          Resume scoring, outreach drafting, and live job search across LinkedIn,
          Indeed, and Glassdoor — backed by a multi-model AI fallback chain so a
          single provider going down never stops your search.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Show when="signed-out">
            <SignUpButton mode="modal">
              <button type="button" className="btn-primary">
                Get started
              </button>
            </SignUpButton>
          </Show>

          <Show when="signed-in">
            <Link href="/dashboard" className="btn-primary">
              Go to dashboard
            </Link>
          </Show>
        </div>

        <div className="mt-12 grid w-full gap-4 text-left sm:grid-cols-3">
          <div className="card">
            <p className="font-ui text-sm font-semibold">Resume analyzer</p>
            <p className="font-body mt-1 text-sm" style={{ color: 'var(--body-text)' }}>
              Match score and specific suggestions against any job description.
            </p>
          </div>
          <div className="card">
            <p className="font-ui text-sm font-semibold">Email drafter</p>
            <p className="font-body mt-1 text-sm" style={{ color: 'var(--body-text)' }}>
              Outreach in your own voice — no generic AI-sounding filler.
            </p>
          </div>
          <div className="card">
            <p className="font-ui text-sm font-semibold">Live job search</p>
            <p className="font-body mt-1 text-sm" style={{ color: 'var(--body-text)' }}>
              Aggregated from multiple sources, deduped, sorted by freshness.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}