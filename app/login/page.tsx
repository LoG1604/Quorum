'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Navbar } from '@/components/navbar';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push('/dashboard');
  };

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-5 pb-20 pt-32 md:pt-40">
        <header>
          <p className="label mb-2">Welcome back</p>
          <h1 className="font-display text-3xl">Sign in</h1>
        </header>

        <div className="card flex flex-col gap-4">
          <div>
            <label className="label mb-1 block">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          <div>
            <label className="label mb-1 block">Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <p className="font-body text-sm" style={{ color: 'var(--unhealthy)' }}>
              {error}
            </p>
          )}

          <button
            type="button"
            className="btn-primary w-full"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Sign in'}
          </button>

          <p className="font-body text-sm" style={{ color: 'var(--body-text)' }}>
            No account?{' '}
            <Link href="/signup" className="underline" style={{ color: 'var(--ink)' }}>
              Sign up
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
