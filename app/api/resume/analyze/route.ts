import 'pdf-parse/worker';
import { PDFParse } from 'pdf-parse';
import { callModelWithFallback } from '@/lib/groq';
import { getUserApiKeys } from '@/lib/user-keys';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const userResult = await getUserApiKeys();
    if (!userResult) {
      return Response.json({ error: 'Not authenticated.' }, { status: 401 });
    }
    if (!userResult.keys.groqApiKey) {
      return Response.json(
        { error: 'Add your Groq API key in Settings to use the resume analyzer.', code: 'missing_keys' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('resume') as File | null;
    const jobDescription = formData.get('jobDescription') as string | null;

    if (!file || !jobDescription) {
      return Response.json(
        { error: 'Both resume PDF and job description are required.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const parser = new PDFParse({ data: buffer });
    const parsed = await parser.getText();
    const resumeText = parsed.text;
    await parser.destroy();

    const prompt = `You are an expert career coach and hiring analyst. Given the following resume and job description, provide:
1. A match score from 0 to 100 indicating how well the resume matches the job requirements.
2. A list of specific, actionable suggestions to improve the resume for this particular job.

RESUME:
"""
${resumeText.slice(0, 6000)}
"""

JOB DESCRIPTION:
"""
${jobDescription.slice(0, 4000)}
"""

Respond in this exact JSON format and nothing else:
{
  "score": <number>,
  "suggestions": ["<suggestion 1>", "<suggestion 2>", ...]
}`;

    const result = await callModelWithFallback(prompt, userResult.keys.groqApiKey, userResult.userId);

    let analysis;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { score: 0, suggestions: ['Could not parse response.'] };
    } catch {
      analysis = { score: 0, suggestions: ['AI returned an unparseable response.'] };
    }

    return Response.json({
      score: analysis.score,
      suggestions: analysis.suggestions,
      modelUsed: result.modelUsed,
      failoverEvents: result.failoverEvents,
      resumeTextLength: resumeText.length,
    });
  } catch (error) {
    console.error('Resume analysis error:', error);
    return Response.json(
      { error: 'Failed to analyze resume. Please try again.' },
      { status: 500 }
    );
  }
}