import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { ModelStatusPanel } from '@/components/model-status-panel';
import { ResumeAnalyzerCard } from '@/components/resume-analyzer-card';
import { EmailDrafterCard } from '@/components/email-drafter-card';
import { JobSearchPanel } from '@/components/job-search-panel';

export default function Dashboard() {
  return (
    <>
      <Navbar />

      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-12 px-5 pb-20 pt-28 md:px-8 md:pt-32">
        <header className="fade-in">
          <p className="label mb-2">Your dashboard</p>
          <h1 className="font-display text-4xl leading-tight md:text-5xl">
            Welcome back.
          </h1>
        </header>

        <ModelStatusPanel />

        <div className="grid gap-6 lg:grid-cols-2">
          <ResumeAnalyzerCard />
          <EmailDrafterCard />
        </div>

        <JobSearchPanel />
      </main>
      <Footer />
    </>
  );
}
