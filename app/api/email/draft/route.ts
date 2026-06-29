import { callModelWithFallback } from '@/lib/groq';
import { getUserApiKeys } from '@/lib/user-keys';
import { computePhrasingScore } from '@/lib/phrasing-score';

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
        { error: 'Add your Groq API key in Settings to use the email drafter.', code: 'missing_keys' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { recipientName, companyName, role, writingSample, context } = body;

    if (!companyName || !role) {
      return Response.json(
        { error: 'Company name and role are required.' },
        { status: 400 }
      );
    }

    const sampleBlock = writingSample
      ? `

Here is an example of the user's personal writing style. Mimic this tone, sentence structure, and vocabulary closely. Do NOT sound like generic AI output — match the human voice below:

"""
${writingSample.slice(0, 2000)}
"""
`
      : '';

    const prompt = `You are a professional email ghostwriter. Write a concise, compelling outreach email AND a short subject line for a job application.
${sampleBlock}
Details:
- Recipient: ${recipientName || 'Hiring Manager'}
- Company: ${companyName}
- Role: ${role}
- Additional context: ${context || 'None provided'}

Rules for the body:
- Keep it under 200 words.
- Do NOT use phrases like "I hope this email finds you well", "I am writing to express my interest", "I believe I would be a great fit", "I am excited about the opportunity", "in today's fast-paced world", "delve into", "leverage", "cutting-edge", "thank you for your time and consideration", or any similarly overused corporate filler.
- Avoid formal connector words like "furthermore", "moreover", "additionally", "consequently" — use plain, direct transitions instead, or none at all.
- Vary your sentence lengths noticeably — mix short, punchy sentences with longer ones. Uniform sentence length is a strong tell of AI-generated text; actively avoid it.
- Sound like a real person, not an AI. Use contractions. Be direct.
- Include a specific, compelling hook in the opening line.
- End with a clear, low-friction call to action.
- Do not overuse em-dashes.

Rules for the subject line:
- Specific to the role and company, e.g. "Application for [Role] at [Company]" or a more direct/personal variant if it fits the tone.
- Under 60 characters.
- No clickbait, no exclamation marks, no emoji.

Respond in this exact JSON format and nothing else:
{
  "subject": "<subject line>",
  "body": "<email body, no greeting prefix, no signature>"
}`;

    const result = await callModelWithFallback(prompt, userResult.keys.groqApiKey, userResult.userId);

    let subject = `Application for ${role} at ${companyName}`;
    let emailBody = result.text;

    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.subject) subject = parsed.subject;
        if (parsed.body) emailBody = parsed.body;
      }
    } catch {
      // If the model didn't return valid JSON, fall back to using the raw
      // text as the body and the generated default subject above.
    }

    const phrasing = computePhrasingScore(emailBody);

    return Response.json({
      subject,
      email: emailBody,
      modelUsed: result.modelUsed,
      failoverEvents: result.failoverEvents,
      phrasingScore: phrasing,
    });
  } catch (error) {
    console.error('Email draft error:', error);
    return Response.json(
      { error: 'Failed to generate email. Please try again.' },
      { status: 500 }
    );
  }
}