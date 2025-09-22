// Validator for second-pass outputs

import type { FirstPass, SecondPassOutput } from "./types.js";

export function validateSecondPass(jsonStr: string, first: FirstPass): SecondPassOutput {
  const out = JSON.parse(jsonStr) as SecondPassOutput;
  
  // basic shape
  if (!out.summary || !out.narrativeSummary || !out.observation) {
    throw new Error("Missing core fields");
  }
  
  // rationale sids must come from first
  const validSids = new Set(first.quoteSidList ?? []);
  if (!validSids.size) {
    throw new Error("No quoteSidList in first pass");
  }
  
  for (const r of out.rationales ?? []) {
    if (!validSids.has(r.sid)) {
      throw new Error(`Invalid rationale sid: ${r.sid}`);
    }
  }
  
  if (!validSids.has(out.sentiment.rationaleSid)) {
    throw new Error("Invalid sentiment.rationaleSid");
  }

  // validate surfaced relations are from first pass
  const validRelations = new Set(first.relations.map(r => `${r.type}-${r.sidA}-${r.sidB || ''}-${r.note}`));
  for (const relation of out.surfacedRelations ?? []) {
    const relationKey = `${relation.type}-${relation.sidA}-${relation.sidB || ''}-${relation.note}`;
    if (!validRelations.has(relationKey)) {
      console.warn(`Surfaced relation not found in first pass: ${relationKey}`);
    }
  }

  // micro field length guards (soft) - truncate instead of failing
  if (out.micro.nextAction.length > 50) {
    console.warn(`nextAction too long (${out.micro.nextAction.length} chars), truncating`);
    out.micro.nextAction = out.micro.nextAction.substring(0, 47) + '...';
  }
  if (out.micro.question.length > 80) {
    console.warn(`question too long (${out.micro.question.length} chars), truncating`);
    out.micro.question = out.micro.question.substring(0, 77) + '...';
  }

  return out;
}
