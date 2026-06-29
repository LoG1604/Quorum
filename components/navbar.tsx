'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';

export function Navbar() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = React.useState(false);
    const [menuOpen, setMenuOpen] = React.useState(false);

    React.useEffect(() => setMounted(true), []);

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const navItems = ['Model Status', 'Resume', 'Email', 'Jobs', 'Setup Keys'];

    const hrefFor = (label: string) =>
        label === 'Setup Keys' ? '/dashboard/settings' : `/dashboard#${label.toLowerCase().replace(' ', '-')}`;

    return (
        <>
            <nav className="glass-nav font-ui flex items-center justify-between">
                <Link href="/" className="font-display text-lg" style={{ letterSpacing: '-0.01em' }}>
                    Quorum
                </Link>

                <div className="hidden items-center gap-6 md:flex">
                    <Show when="signed-in">
                        {navItems.map((label) => (
                            <Link key={label} href={hrefFor(label)} className="label hover:underline">
                                {label}
                            </Link>
                        ))}
                    </Show>
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

                    <Show when="signed-out">
                        <SignInButton mode="modal">
                            <button type="button" className="btn-outline">
                                Sign in
                            </button>
                        </SignInButton>
                        <SignUpButton mode="modal">
                            <button type="button" className="btn-primary">
                                Sign up
                            </button>
                        </SignUpButton>
                    </Show>

                    <Show when="signed-in">
                        <UserButton />
                    </Show>

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

                <Show when="signed-in">
                    {navItems.map((label) => (
                        <Link
                            key={label}
                            href={hrefFor(label)}
                            onClick={() => setMenuOpen(false)}
                            className="font-display text-2xl"
                        >
                            {label}
                        </Link>
                    ))}
                </Show>

                <Show when="signed-out">
                    <SignInButton mode="modal">
                        <button type="button" className="btn-outline w-full" onClick={() => setMenuOpen(false)}>
                            Sign in
                        </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                        <button type="button" className="btn-primary w-full" onClick={() => setMenuOpen(false)}>
                            Sign up
                        </button>
                    </SignUpButton>
                </Show>
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