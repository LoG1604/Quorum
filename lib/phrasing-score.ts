// ─── Heuristic phrasing score ──────────────────────────────────────────────
// IMPORTANT: this is NOT an AI-detection classifier. No tool — including
// commercial ones like GPTZero or Originality.ai — can reliably guarantee
// a text's AI-detection probability; they disagree with each other and have
// real false-positive/negative rates. This module checks for concrete,
// well-known patterns that make AI writing recognizable (cliché phrases,
// uniform sentence length, overused formal connectors, em-dash overuse).
// Treat the result as a phrasing-quality nudge, not a guarantee.

const CLICHE_PHRASES = [
  'i hope this email finds you well',
  'i am writing to',
  "i'm writing to",
  'i am excited about the opportunity',
  'i believe i would be a great fit',
  'in today\'s fast-paced world',
  'in today\'s digital age',
  'delve into',
  "it's worth noting",
  'it is worth noting',
  'unlock the potential',
  'navigate the landscape',
  'navigate the complexities',
  'cutting-edge',
  'game-changer',
  'game changer',
  'seamless',
  'robust solution',
  'leverage',
  'at the end of the day',
  'in order to',
  'due to the fact that',
  'plays a crucial role',
  'plays a vital role',
  'in conclusion',
  'i look forward to the opportunity',
  'thank you for your time and consideration',
];

const FORMAL_CONNECTORS = [
  'furthermore',
  'moreover',
  'additionally',
  'consequently',
  'therefore',
  'thus',
  'in addition',
  'as such',
  'notably',
];

interface PhrasingScoreResult {
  score: number; // 0-100, higher = more recognizably AI-patterned
  flags: string[];
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function wordCount(sentence: string): number {
  return sentence.split(/\s+/).filter(Boolean).length;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stdDev(nums: number[], avg: number): number {
  if (nums.length === 0) return 0;
  const variance = mean(nums.map((n) => (n - avg) ** 2));
  return Math.sqrt(variance);
}

export function computePhrasingScore(text: string): PhrasingScoreResult {
  const lower = text.toLowerCase();
  const flags: string[] = [];
  let score = 0;

  // 1. Cliché phrase detection — each hit is a strong, concrete signal
  const clicheHits = CLICHE_PHRASES.filter((phrase) => lower.includes(phrase));
  if (clicheHits.length > 0) {
    score += Math.min(40, clicheHits.length * 15);
    flags.push(`Contains ${clicheHits.length} common AI-sounding phrase(s)`);
  }

  // 2. Sentence length uniformity — real human writing varies sentence
  // length more; very low variance reads as mechanical
  const sentences = splitSentences(text);
  if (sentences.length >= 3) {
    const lengths = sentences.map(wordCount);
    const avgLen = mean(lengths);
    const sd = stdDev(lengths, avgLen);
    const coefficientOfVariation = avgLen > 0 ? sd / avgLen : 0;
    if (coefficientOfVariation < 0.3) {
      score += 25;
      flags.push('Sentence lengths are unusually uniform');
    }
  }

  // 3. Formal connector overuse
  const connectorHits = FORMAL_CONNECTORS.filter((word) => lower.includes(word));
  if (connectorHits.length >= 2) {
    score += 20;
    flags.push('Multiple formal connector words (furthermore, moreover, etc.)');
  } else if (connectorHits.length === 1) {
    score += 10;
    flags.push('Uses a formal connector word');
  }

  // 4. Em-dash overuse — a well-known AI-writing tic. Require at least two
  // occurrences so one incidental dash in short text doesn't false-positive.
  const emDashCount = (text.match(/—/g) || []).length;
  const wordsTotal = wordCount(text);
  if (emDashCount >= 2 && wordsTotal > 0 && emDashCount / wordsTotal > 0.012) {
    score += 15;
    flags.push('Frequent em-dash usage');
  }

  return { score: Math.min(100, score), flags };
}
