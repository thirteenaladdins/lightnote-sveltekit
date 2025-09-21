// debug-quote-mismatch.ts — Debug quote mismatch issues

import { getAllEntriesWithAnalysis } from '../stores/entries.js';
import { normalizeForStorage, normalizeQuoteText } from './text-normalization.js';

/**
 * Debug function to investigate quote mismatch issues for a specific entry
 */
export function debugQuoteMismatch(entryId: string) {
  console.log(`🔍 [DEBUG-QUOTES] Investigating quote mismatch for entry: ${entryId}`);
  
  const entries = getAllEntriesWithAnalysis();
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry) {
    console.log('❌ [DEBUG-QUOTES] Entry not found');
    return;
  }
  
  console.log('📝 [DEBUG-QUOTES] Entry found:', {
    id: entry.id,
    textLength: entry.text.length,
    textPreview: entry.text.substring(0, 200) + '...',
    hasAnalysis: !!entry.analysis,
    hasKeySentences: !!(entry.analysis?.keySentences?.length)
  });
  
  if (!entry.analysis?.keySentences?.length) {
    console.log('❌ [DEBUG-QUOTES] No key sentences found in analysis');
    return;
  }
  
  console.log('🔍 [DEBUG-QUOTES] Key sentences from analysis:', entry.analysis.keySentences);
  
  // Normalize the text
  const normalizedText = normalizeForStorage(entry.text);
  console.log('📝 [DEBUG-QUOTES] Normalized text preview:', normalizedText.substring(0, 200) + '...');
  
  // Test each quote
  entry.analysis.keySentences.forEach((sentence, index) => {
    console.log(`\n🔍 [DEBUG-QUOTES] Testing quote ${index + 1}:`);
    console.log('Quote text:', JSON.stringify(sentence.text));
    console.log('Quote length:', sentence.text.length);
    
    // Normalize the quote
    const normalizedQuote = sentence.text.normalize('NFC').replace(/\r\n/g, '\n');
    console.log('Normalized quote:', JSON.stringify(normalizedQuote));
    console.log('Normalized quote length:', normalizedQuote.length);
    
    // Try to find it in the text
    const foundIndex = normalizedText.indexOf(normalizedQuote);
    console.log('Found at index:', foundIndex);
    
    if (foundIndex === -1) {
      console.log('❌ [DEBUG-QUOTES] Quote not found in text');
      
      // Try to find partial matches
      const words = normalizedQuote.split(' ');
      console.log('🔍 [DEBUG-QUOTES] Trying to find partial matches...');
      
      for (let i = 0; i < words.length; i++) {
        const partialQuote = words.slice(0, i + 1).join(' ');
        const partialIndex = normalizedText.indexOf(partialQuote);
        if (partialIndex !== -1) {
          console.log(`✅ [DEBUG-QUOTES] Found partial match (${i + 1} words):`, partialQuote);
        } else {
          console.log(`❌ [DEBUG-QUOTES] No match for first ${i + 1} words:`, partialQuote);
          break;
        }
      }
      
      // Check for character differences
      console.log('🔍 [DEBUG-QUOTES] Character analysis:');
      console.log('Quote characters:', Array.from(normalizedQuote).map(c => c.charCodeAt(0)));
      console.log('Text around cursor 662:', Array.from(normalizedText.substring(650, 680)).map(c => c.charCodeAt(0)));
      
    } else {
      console.log('✅ [DEBUG-QUOTES] Quote found successfully');
      console.log('Context around match:', normalizedText.substring(Math.max(0, foundIndex - 50), foundIndex + normalizedQuote.length + 50));
    }
  });
  
  console.log('\n✅ [DEBUG-QUOTES] Analysis complete');
}

/**
 * Advanced debug function to find the exact mismatch
 */
export function debugQuoteMismatchAdvanced(entryId: string) {
  console.log(`🔍 [DEBUG-QUOTES-ADVANCED] Deep analysis for entry: ${entryId}`);
  
  const entries = getAllEntriesWithAnalysis();
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry || !entry.analysis?.keySentences?.length) {
    console.log('❌ [DEBUG-QUOTES-ADVANCED] Entry or key sentences not found');
    return;
  }
  
  const normalizedText = normalizeForStorage(entry.text);
  
  // Find the problematic quote from the error message
  const problematicQuote = "But it felt really weird the first time, like it shouldn't have happened.";
  console.log('🎯 [DEBUG-QUOTES-ADVANCED] Looking for specific quote:', JSON.stringify(problematicQuote));
  
  // Check if this quote exists in the key sentences
  const matchingSentence = entry.analysis.keySentences.find(s => 
    s.text.includes("But it felt really weird") || 
    s.text.includes("weird the first time") ||
    s.text.includes("shouldn't have happened")
  );
  
  if (matchingSentence) {
    console.log('✅ [DEBUG-QUOTES-ADVANCED] Found matching sentence in keySentences:', matchingSentence);
  } else {
    console.log('❌ [DEBUG-QUOTES-ADVANCED] No matching sentence found in keySentences');
    console.log('Available sentences:', entry.analysis.keySentences.map(s => s.text));
  }
  
  // Try different normalization approaches
  const approaches = [
    { name: 'Original', text: entry.text },
    { name: 'NFC Normalized', text: entry.text.normalize('NFC') },
    { name: 'Storage Normalized', text: normalizedText },
    { name: 'NFD Normalized', text: entry.text.normalize('NFD') },
    { name: 'NFKC Normalized', text: entry.text.normalize('NFKC') },
    { name: 'NFKD Normalized', text: entry.text.normalize('NFKD') }
  ];
  
  for (const approach of approaches) {
    console.log(`\n🔍 [DEBUG-QUOTES-ADVANCED] Testing approach: ${approach.name}`);
    const foundIndex = approach.text.indexOf(problematicQuote);
    console.log(`Found at index: ${foundIndex}`);
    
    if (foundIndex !== -1) {
      console.log('✅ [DEBUG-QUOTES-ADVANCED] Quote found with this approach!');
      console.log('Context:', approach.text.substring(Math.max(0, foundIndex - 100), foundIndex + problematicQuote.length + 100));
      break;
    }
  }
  
  // Check for invisible characters
  console.log('\n🔍 [DEBUG-QUOTES-ADVANCED] Checking for invisible characters...');
  const textChars = Array.from(normalizedText);
  const invisibleChars = textChars.map((char, index) => ({
    char,
    code: char.charCodeAt(0),
    index,
    isInvisible: char.charCodeAt(0) < 32 || char.charCodeAt(0) === 160
  })).filter(c => c.isInvisible);
  
  if (invisibleChars.length > 0) {
    console.log('⚠️ [DEBUG-QUOTES-ADVANCED] Found invisible characters:', invisibleChars);
  } else {
    console.log('✅ [DEBUG-QUOTES-ADVANCED] No invisible characters found');
  }
  
  // Character-by-character comparison
  console.log('\n🔍 [DEBUG-QUOTES-ADVANCED] Character-by-character analysis...');
  const quoteChars = Array.from(problematicQuote);
  const textAroundQuote = normalizedText.substring(240, 320); // Around where we found "But it"
  const textCharsAround = Array.from(textAroundQuote);
  
  console.log('Quote characters:', quoteChars.map((c, i) => ({ char: c, code: c.charCodeAt(0), pos: i })));
  console.log('Text around quote:', textCharsAround.map((c, i) => ({ char: c, code: c.charCodeAt(0), pos: i })));
  
  // Find the exact position of the quote in the text
  const quoteStart = normalizedText.indexOf("But it felt really weird");
  if (quoteStart !== -1) {
    const actualQuote = normalizedText.substring(quoteStart, quoteStart + problematicQuote.length);
    console.log('Actual quote from text:', JSON.stringify(actualQuote));
    console.log('Expected quote:', JSON.stringify(problematicQuote));
    console.log('Are they equal?', actualQuote === problematicQuote);
    
    // Compare character by character
    for (let i = 0; i < Math.min(actualQuote.length, problematicQuote.length); i++) {
      if (actualQuote[i] !== problematicQuote[i]) {
        console.log(`Character difference at position ${i}:`, {
          actual: actualQuote[i],
          actualCode: actualQuote[i].charCodeAt(0),
          expected: problematicQuote[i],
          expectedCode: problematicQuote[i].charCodeAt(0)
        });
      }
    }
  }
  
  // Try fuzzy matching
  console.log('\n🔍 [DEBUG-QUOTES-ADVANCED] Trying fuzzy matching...');
  const words = problematicQuote.split(' ');
  for (let i = 0; i < words.length - 1; i++) {
    const phrase = words.slice(i, i + 2).join(' ');
    const foundIndex = normalizedText.indexOf(phrase);
    if (foundIndex !== -1) {
      console.log(`✅ [DEBUG-QUOTES-ADVANCED] Found phrase "${phrase}" at index ${foundIndex}`);
      console.log('Context:', normalizedText.substring(Math.max(0, foundIndex - 50), foundIndex + phrase.length + 50));
    }
  }
  
  console.log('\n✅ [DEBUG-QUOTES-ADVANCED] Advanced analysis complete');
}

/**
 * Debug function to check text normalization differences
 */
export function debugTextNormalization(text: string) {
  console.log('🔍 [DEBUG-NORMALIZATION] Analyzing text normalization:');
  console.log('Original text length:', text.length);
  console.log('Original text preview:', text.substring(0, 100) + '...');
  
  const normalized = normalizeForStorage(text);
  console.log('Normalized text length:', normalized.length);
  console.log('Normalized text preview:', normalized.substring(0, 100) + '...');
  
  console.log('Are they equal?', text === normalized);
  console.log('Length difference:', normalized.length - text.length);
  
  // Check for specific characters that might cause issues
  const originalChars = Array.from(text);
  const normalizedChars = Array.from(normalized);
  
  console.log('Character differences:');
  for (let i = 0; i < Math.min(originalChars.length, normalizedChars.length); i++) {
    if (originalChars[i] !== normalizedChars[i]) {
      console.log(`Position ${i}: '${originalChars[i]}' (${originalChars[i].charCodeAt(0)}) vs '${normalizedChars[i]}' (${normalizedChars[i].charCodeAt(0)})`);
    }
  }
}

/**
 * Test the new quote normalization function
 */
export function testQuoteNormalization(entryId: string) {
  console.log(`🧪 [TEST-NORMALIZATION] Testing quote normalization for entry: ${entryId}`);
  
  const entries = getAllEntriesWithAnalysis();
  const entry = entries.find(e => e.id === entryId);
  
  if (!entry || !entry.analysis?.keySentences?.length) {
    console.log('❌ [TEST-NORMALIZATION] Entry or key sentences not found');
    return;
  }
  
  const testQuote = "But it felt really weird the first time, like it shouldn't have happened.";
  console.log('🎯 [TEST-NORMALIZATION] Testing quote:', JSON.stringify(testQuote));
  
  // Test the old normalization
  const oldNormalized = testQuote.normalize('NFC').replace(/\r\n/g, '\n');
  console.log('Old normalization:', JSON.stringify(oldNormalized));
  
  // Test the new normalization
  const newNormalized = normalizeQuoteText(testQuote);
  console.log('New normalization:', JSON.stringify(newNormalized));
  
  // Test on the actual text
  const textOldNorm = normalizeForStorage(entry.text);
  const textNewNorm = normalizeQuoteText(entry.text);
  
  console.log('Text old normalization length:', textOldNorm.length);
  console.log('Text new normalization length:', textNewNorm.length);
  
  // Test finding the quote with both methods
  const oldIndex = textOldNorm.indexOf(oldNormalized);
  const newIndex = textNewNorm.indexOf(newNormalized);
  
  console.log('Old method found at index:', oldIndex);
  console.log('New method found at index:', newIndex);
  
  if (oldIndex !== -1) {
    console.log('Old method context:', textOldNorm.substring(Math.max(0, oldIndex - 50), oldIndex + oldNormalized.length + 50));
  }
  
  if (newIndex !== -1) {
    console.log('New method context:', textNewNorm.substring(Math.max(0, newIndex - 50), newIndex + newNormalized.length + 50));
  }
  
  console.log('✅ [TEST-NORMALIZATION] Test complete');
}
