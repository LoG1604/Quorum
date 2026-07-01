'use client';

import * as React from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';

export default function Home() {
  const [user, setUser] = React.useState<User | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
          {user ? (
            <Link href="/dashboard" className="btn-primary">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link href="/signup" className="btn-primary">
                Get started
              </Link>
              <Link href="/login" className="btn-outline">
                Sign in
              </Link>
            </>
          )}
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

      <Footer />
    </>
  );
}