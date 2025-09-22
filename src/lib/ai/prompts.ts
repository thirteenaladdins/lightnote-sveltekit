// AI prompts for two-pass journal analysis

import type { FirstPass } from "./types.js";

export const FIRST_PASS_PROMPT = (sentenceData: unknown) => `
Analyze the journal entry and select key quotes that capture the emotional arc and important insights.

SENTENCES:
${JSON.stringify(sentenceData, null, 2)}

Return JSON using this schema (t1 is EXCLUSIVE):
{
  "quotes": [
    { "sid": 3, "reason": "process plan", "themeIds": ["t.change"], "entityIds": ["e.dave"] },
    { "sidRange": [7, 9], "reason": "emotional moment" },
    { "sid": 12, "reason": "decision point" }
  ],
  "emotions": [{ "label": "joy", "confidence": 0.80 }],
  "themes":   [{ "id": "t.change", "name": "change", "confidence": 0.90 }],
  "entities": [{ "id": "e.dave", "name": "Dave", "type": "person", "salience": 0.70, "sentiment": 0.20 }],
  "relations": [
    { "type": "contradiction", "sidA": 4, "sidB": 9, "note": "claim vs action", "confidence": 0.85 },
    { "type": "uncertainty", "sidA": 7, "note": "unclear about next steps", "confidence": 0.70 },
    { "type": "escalation", "sidA": 2, "sidB": 8, "note": "frustration building", "confidence": 0.80 }
  ],
  "observation": { "text": "Interpretive but grounded; no new concepts.", "evidenceSids": [3,7] },
  "coverage": { "begin": true, "middle": false, "end": true },
  "buckets": { "feeling": true, "rule": true, "consequence": false, "decision": false, "missing": ["consequence","decision"] }
}

Selection Rules:
- STRONGLY PREFER "sid" or "sidRange" (consecutive).
- Use "t0/t1" or "char0/char1" ONLY if idea is fully within a single sentence and bounded by punctuation; snap to word boundaries.
- Select 3–6 quotes total. Aim to cover: feeling → rule/boundary → consequence → decision (if present).
- If brain-dump, pick the most representative 3–6 sentences by emotion intensity or repetition.

Relations Rules:
- Identify contradictions, uncertainties, escalations, patterns, or tensions between quotes
- Use "contradiction" for conflicting statements/actions
- Use "uncertainty" for unclear or hesitant statements
- Use "escalation" for building intensity or emotion
- Use "pattern" for repeated themes or behaviors
- Use "tension" for unresolved conflicts or dilemmas
- Include confidence score (0-1) for each relation
- sidB is optional for single-sentence relations

Diversity Requirements:
Include at least one quote for (a) desire/feeling, (b) rule/boundary ("should/shouldn't"), (c) consequence/fear, (d) decision (if present). List any missing under buckets.missing.

Important:
- Complete thoughts only; avoid mid-word fragments.
- "observation" must be supported by evidenceSids; no new topics.
- Keep every "reason" ≤ 3 words.
- Emit stable ids for themes/entities if obvious; ids may be simple slugs.
- Output MUST be valid JSON.
`;

export const SECOND_PASS_SUMMARY_PROMPT = (sentenceData: unknown, firstPassJson: FirstPass) => `
Using ONLY the sentences and the extracted evidence below, write STRICT JSON.

SENTENCES:
${JSON.stringify(sentenceData, null, 2)}

EVIDENCE:
${JSON.stringify(firstPassJson, null, 2)}

Write STRICT JSON:
{
  "summary": "<=3 sentences, warm & first-person, UK English. Capture MY perspective - how I saw/experienced it. Avoid flat 'she did X, then Y' lists.",
  "narrativeSummary": "Chronological facts only. 2–3 sentences; reflect emotional arc in EVIDENCE.coverage.",
  "observation": "2–3 sentences on meaning/relations, grounded in EVIDENCE.observation.evidenceSids or quotes. NO labels like 'manipulative'. Only highlight contradictions, tensions, or consistencies using evidence quotes. Interpret gently.",
  "sentiment": { "score": -1..1, "label": "negative|mixed|positive", "rationaleSid": <sid> },
  "rationales": [{ "sid": <number>, "why": "<=12 words>" }],
  "micro": { "nextAction": "<=10 words (be concise)", "question": "<=15 words (be concise)" },
  "trace": { "usedThemes": ["<subset of themes.name>"], "usedEntities": ["<top 1–3>"], "usedQuoteSids": [ ... ] },
  "surfacedRelations": [<subset of EVIDENCE.relations>]
}

HARD RULES:
- Use ONLY content supported by SENTENCES and EVIDENCE.
- Prefer EVIDENCE.quotes (sid/sidRange) for grounding; never invent quotes.
- If EVIDENCE.buckets.missing includes "consequence" or "decision", avoid implying them.
- Keep narrative vs observation distinct. If uncertain, hedge once.
- UK English. No clinical labels. Valid JSON only.
- Cap trace.usedQuoteSids to 3–6, covering feeling → rule → consequence → decision if present.
- surfacedRelations: Choose 0-3 most relevant relations from EVIDENCE.relations to surface in final output.
- Only surface relations that add meaningful insight to the observation or summary.
- CRITICAL: Keep micro.nextAction ≤10 words and micro.question ≤15 words. Be extremely concise.

SUMMARY GUARD:
- summary MUST be warm, in first-person, UK English.
- Avoid flat "she did X, then Y."
- Capture *my* perspective (how I saw/experienced it).

OBSERVATION GUARD:
- No labels like "manipulative" or clinical terms.
- Only highlight contradictions, tensions, or consistencies using evidence quotes.
- Interpret gently, e.g., "You're noticing the gap between what she said and what she did."

THEMES/ENTITIES FILTER:
- Only keep themes/entities with explicit support in quotes.
- If none have clear evidence, return empty arrays.
- Avoid generic themes like "change" without specific quote backing.
`;
