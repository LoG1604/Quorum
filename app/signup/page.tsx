'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Navbar } from '@/components/navbar';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [verifyMsg, setVerifyMsg] = React.useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      setError('Email and password are required.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setVerifyMsg(true);
    setLoading(false);
  };

  if (verifyMsg) {
    return (
      <>
        <Navbar />
        <main className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-5 pb-20 pt-32 text-center md:pt-40">
          <h1 className="font-display text-3xl">Check your email</h1>
          <p className="font-body" style={{ color: 'var(--body-text)' }}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.
          </p>
          <Link href="/login" className="btn-primary">
            Go to sign in
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto flex w-full max-w-[440px] flex-col gap-6 px-5 pb-20 pt-32 md:pt-40">
        <header>
          <p className="label mb-2">Get started</p>
          <h1 className="font-display text-3xl">Create account</h1>
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
              onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
            />
          </div>

          <div>
            <label className="label mb-1 block">Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSignup()}
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
            onClick={handleSignup}
            disabled={loading}
          >
            {loading ? <span className="spinner" /> : 'Create account'}
          </button>

          <p className="font-body text-sm" style={{ color: 'var(--body-text)' }}>
            Already have an account?{' '}
            <Link href="/login" className="underline" style={{ color: 'var(--ink)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
