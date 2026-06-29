'use client';

import * as React from 'react';

interface AnalysisResult {
  score: number;
  suggestions: string[];
  modelUsed: string;
  failoverEvents: { from: string; to: string; reason: string }[];
}

export function ResumeAnalyzerCard() {
  const [file, setFile] = React.useState<File | null>(null);
  const [jobDescription, setJobDescription] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<AnalysisResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [dragActive, setDragActive] = React.useState(false);

  const handleFile = (f: File | null) => {
    if (f && f.type !== 'application/pdf') {
      setError('Please upload a PDF file.');
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleSubmit = async () => {
    if (!file || !jobDescription.trim()) {
      setError('Add a resume PDF and a job description first.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('resume', file);
      formData.append('jobDescription', jobDescription);

      const res = await fetch('/api/resume/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="resume" className="card fade-in">
      <h2 className="font-display mb-1 text-2xl">Resume analyzer</h2>
      <p className="font-body mb-5" style={{ color: 'var(--body-text)' }}>
        Upload your resume and a job description to get a match score and specific
        suggestions.
      </p>

      <div
        className={`upload-zone font-ui mb-4 ${dragActive ? 'active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        onClick={() => document.getElementById('resume-input')?.click()}
      >
        <input
          id="resume-input"
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {file ? (
          <span className="label">{file.name}</span>
        ) : (
          <span className="label">Drop your resume PDF here, or click to browse</span>
        )}
      </div>

      <textarea
        className="textarea-field mb-4"
        placeholder="Paste the job description here…"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />

      <button
        type="button"
        className="btn-primary"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? <span className="spinner" /> : 'Analyze match'}
      </button>

      {error && (
        <p className="font-body mt-3" style={{ color: 'var(--unhealthy)' }}>
          {error}
        </p>
      )}

      {result && (
        <div className="fade-in mt-6" style={{ borderTop: '1px solid var(--hairline)', paddingTop: 'var(--sp-5)' }}>
          <div className="mb-4 flex items-center gap-4">
            <div className="score-ring">{result.score}</div>
            <div>
              <p className="font-ui text-sm font-semibold">Match score</p>
              <p className="label">Answered by {result.modelUsed}</p>
            </div>
          </div>

          <ul className="font-body flex flex-col gap-2">
            {result.suggestions.map((s, i) => (
              <li key={i} style={{ paddingLeft: 'var(--sp-4)', borderLeft: '2px solid var(--hairline)' }}>
                {s}
              </li>
            ))}
          </ul>

          {result.failoverEvents.length > 0 && (
            <p className="label mt-4">
              Failover: {result.failoverEvents.map((f) => `${f.from} → ${f.to}`).join(', ')}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
