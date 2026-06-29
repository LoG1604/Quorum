import Link from 'next/link';

export function Footer() {
  return (
    <footer
      className="font-ui mt-20 border-t"
      style={{ borderColor: 'var(--hairline)' }}
    >
      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-5 py-10 md:flex-row md:items-start md:justify-between md:px-8">
        <div>
          <p className="font-display text-lg">Quorum</p>
          <p className="label mt-1">Built by Lakshay Gupta</p>
        </div>

        <div className="max-w-md">
          <p className="label mb-2">Bring your own API keys</p>
          <p className="font-body text-sm" style={{ color: 'var(--body-text)' }}>
            Quorum doesn&apos;t share its own AI or job-search quota with visitors.
            Add your own free-tier Groq, Adzuna, and RapidAPI keys in Settings —
            nothing runs on this app&apos;s infrastructure, your keys, your usage,
            your limits.
          </p>
          <Link href="/dashboard/settings" className="label mt-2 inline-block underline">
            Get your keys →
          </Link>
        </div>
      </div>
    </footer>
  );
}
