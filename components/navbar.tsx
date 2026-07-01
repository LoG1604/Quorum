'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export function Navbar() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [menuOpen, setMenuOpen] = React.useState(false);
    const [user, setUser] = React.useState<User | null>(null);

    React.useEffect(() => {
        setMounted(true);
        const supabase = createClient();

        // Get current session on mount
        supabase.auth.getUser().then(({ data }) => {
            setUser(data.user);
        });

        // Listen for auth changes (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/';
    };

    const navItems = ['Model Status', 'Resume', 'Email', 'Jobs', 'Setup Keys'];
    const hrefFor = (label: string) =>
        label === 'Setup Keys'
            ? '/dashboard/settings'
            : `/dashboard#${label.toLowerCase().replace(' ', '-')}`;

    return (
        <>
            <nav className="glass-nav font-ui flex items-center justify-between">
                <Link href="/" className="font-display text-lg" style={{ letterSpacing: '-0.01em' }}>
                    Quorum
                </Link>

                <div className="hidden items-center gap-6 md:flex">
                    {user && navItems.map((label) => (
                        <Link key={label} href={hrefFor(label)} className="label hover:underline">
                            {label}
                        </Link>
                    ))}
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        aria-label="Toggle theme"
                        onClick={toggleTheme}
                        className="flex h-9 w-9 items-center justify-center rounded-full border"
                        style={{ borderColor: 'var(--hairline)' }}
                    >
                        {mounted && theme === 'dark' ? <SunIcon /> : <MoonIcon />}
                    </button>

                    {!user ? (
                        <>
                            <Link href="/login" className="btn-outline">Sign in</Link>
                            <Link href="/signup" className="btn-primary">Sign up</Link>
                        </>
                    ) : (
                        <button type="button" onClick={handleSignOut} className="btn-outline">
                            Sign out
                        </button>
                    )}

                    <button
                        type="button"
                        aria-label="Open menu"
                        onClick={() => setMenuOpen(true)}
                        className="flex h-9 w-9 items-center justify-center md:hidden"
                    >
                        <MenuIcon />
                    </button>
                </div>
            </nav>

            <div className={`mobile-menu font-ui ${menuOpen ? 'open' : ''}`}>
                <button
                    type="button"
                    aria-label="Close menu"
                    onClick={() => setMenuOpen(false)}
                    className="self-end text-2xl"
                >
                    ×
                </button>

                {user && navItems.map((label) => (
                    <Link
                        key={label}
                        href={hrefFor(label)}
                        onClick={() => setMenuOpen(false)}
                        className="font-display text-2xl"
                    >
                        {label}
                    </Link>
                ))}

                {!user && (
                    <>
                        <Link href="/login" onClick={() => setMenuOpen(false)} className="btn-outline w-full">
                            Sign in
                        </Link>
                        <Link href="/signup" onClick={() => setMenuOpen(false)} className="btn-primary w-full">
                            Sign up
                        </Link>
                    </>
                )}
            </div>
        </>
    );
}

function SunIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

function MenuIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
    );
}