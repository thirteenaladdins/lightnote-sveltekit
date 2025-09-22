// Unit tests for validator

import { describe, it, expect } from 'vitest';
import { validateSecondPass } from './validate.js';
import type { FirstPass } from './types.js';

describe('validateSecondPass', () => {
  const mockFirstPass: FirstPass = {
    quotes: [],
    emotions: [],
    themes: [],
    entities: [],
    relations: [
      { type: 'contradiction', sidA: 1, sidB: 3, note: 'test contradiction', confidence: 0.8 },
      { type: 'uncertainty', sidA: 2, note: 'test uncertainty', confidence: 0.7 }
    ],
    observation: { text: 'test', evidenceSids: [] },
    coverage: { begin: true, middle: true, end: true },
    buckets: { feeling: true, rule: false, consequence: false, decision: false, missing: [] },
    quoteSidList: [1, 2, 3, 5, 8]
  };

  it('should validate correct second-pass output', () => {
    const validJson = JSON.stringify({
      summary: 'Test summary',
      narrativeSummary: 'Test narrative',
      observation: 'Test observation',
      sentiment: { score: 0.5, label: 'positive', rationaleSid: 2 },
      rationales: [{ sid: 2, why: 'test reason' }],
      micro: { nextAction: 'test action', question: 'test question' },
      trace: { usedThemes: ['theme1'], usedEntities: ['entity1'], usedQuoteSids: [1, 2] },
      surfacedRelations: [{ type: 'contradiction', sidA: 1, sidB: 3, note: 'test contradiction', confidence: 0.8 }]
    });

    const result = validateSecondPass(validJson, mockFirstPass);
    
    expect(result.summary).toBe('Test summary');
    expect(result.sentiment.rationaleSid).toBe(2);
    expect(result.rationales).toHaveLength(1);
    expect(result.surfacedRelations).toHaveLength(1);
  });

  it('should fail on missing core fields', () => {
    const invalidJson = JSON.stringify({
      summary: 'Test summary',
      // missing narrativeSummary and observation
      sentiment: { score: 0.5, label: 'positive', rationaleSid: 2 },
      rationales: [],
      micro: { nextAction: 'test', question: 'test' },
      trace: { usedThemes: [], usedEntities: [], usedQuoteSids: [] },
      surfacedRelations: []
    });

    expect(() => validateSecondPass(invalidJson, mockFirstPass)).toThrow('Missing core fields');
  });

  it('should fail on invalid rationale sid', () => {
    const invalidJson = JSON.stringify({
      summary: 'Test summary',
      narrativeSummary: 'Test narrative',
      observation: 'Test observation',
      sentiment: { score: 0.5, label: 'positive', rationaleSid: 2 },
      rationales: [{ sid: 99, why: 'test reason' }], // 99 not in quoteSidList
      micro: { nextAction: 'test', question: 'test' },
      trace: { usedThemes: [], usedEntities: [], usedQuoteSids: [] },
      surfacedRelations: []
    });

    expect(() => validateSecondPass(invalidJson, mockFirstPass)).toThrow('Invalid rationale sid: 99');
  });

  it('should fail on invalid sentiment rationaleSid', () => {
    const invalidJson = JSON.stringify({
      summary: 'Test summary',
      narrativeSummary: 'Test narrative',
      observation: 'Test observation',
      sentiment: { score: 0.5, label: 'positive', rationaleSid: 99 }, // 99 not in quoteSidList
      rationales: [],
      micro: { nextAction: 'test', question: 'test' },
      trace: { usedThemes: [], usedEntities: [], usedQuoteSids: [] },
      surfacedRelations: []
    });

    expect(() => validateSecondPass(invalidJson, mockFirstPass)).toThrow('Invalid sentiment.rationaleSid');
  });

  it('should fail on empty quoteSidList in first pass', () => {
    const emptyFirstPass: FirstPass = {
      ...mockFirstPass,
      quoteSidList: []
    };

    const validJson = JSON.stringify({
      summary: 'Test summary',
      narrativeSummary: 'Test narrative',
      observation: 'Test observation',
      sentiment: { score: 0.5, label: 'positive', rationaleSid: 1 },
      rationales: [],
      micro: { nextAction: 'test', question: 'test' },
      trace: { usedThemes: [], usedEntities: [], usedQuoteSids: [] },
      surfacedRelations: []
    });

    expect(() => validateSecondPass(validJson, emptyFirstPass)).toThrow('No quoteSidList in first pass');
  });

  it('should truncate too long nextAction', () => {
    const longNextAction = 'This is a very long next action that exceeds the 50 character limit and should be truncated';
    const json = JSON.stringify({
      summary: 'Test summary',
      narrativeSummary: 'Test narrative',
      observation: 'Test observation',
      sentiment: { score: 0.5, label: 'positive', rationaleSid: 2 },
      rationales: [],
      micro: { nextAction: longNextAction, question: 'test' },
      trace: { usedThemes: [], usedEntities: [], usedQuoteSids: [] },
      surfacedRelations: []
    });

    const result = validateSecondPass(json, mockFirstPass);
    expect(result.micro.nextAction).toContain('...');
    expect(result.micro.nextAction.length).toBeLessThanOrEqual(50);
  });

  it('should truncate too long question', () => {
    const longQuestion = 'This is a very long question that exceeds the 80 character limit and should be truncated to fit within the allowed length';
    const json = JSON.stringify({
      summary: 'Test summary',
      narrativeSummary: 'Test narrative',
      observation: 'Test observation',
      sentiment: { score: 0.5, label: 'positive', rationaleSid: 2 },
      rationales: [],
      micro: { nextAction: 'test', question: longQuestion },
      trace: { usedThemes: [], usedEntities: [], usedQuoteSids: [] },
      surfacedRelations: []
    });

    const result = validateSecondPass(json, mockFirstPass);
    expect(result.micro.question).toContain('...');
    expect(result.micro.question.length).toBeLessThanOrEqual(80);
  });
});
