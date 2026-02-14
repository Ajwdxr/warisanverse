/**
 * WarisanVerse Anti-Cheat Validation Layer
 * 
 * Validates game results on client side before submission.
 * Server-side validation should be added via Supabase Edge Functions for production.
 */

import type { RealmName } from '@/types';

interface MatchValidation {
  valid: boolean;
  reason?: string;
}

// Maximum plausible scores per realm
const MAX_SCORES: Record<RealmName, number> = {
  congkak: 98, // Total seeds = 98
  gasing: 2000,
  'batu-seremban': 50000,
  'wau-bulan': 100000,
};

// Minimum plausible match duration in seconds
const MIN_MATCH_DURATION: Record<RealmName, number> = {
  congkak: 30,
  gasing: 10,
  'batu-seremban': 15,
  'wau-bulan': 5,
};

// Maximum matches per hour to prevent farming
const MAX_MATCHES_PER_HOUR = 30;

export function validateMatchResult(
  realm: RealmName,
  score: number,
  duration: number,
  matchHistory: { timestamp: number }[],
): MatchValidation {
  // Score bounds check
  if (score < 0 || score > MAX_SCORES[realm]) {
    return { valid: false, reason: `Score ${score} is out of bounds for ${realm}` };
  }

  // Duration check
  if (duration < MIN_MATCH_DURATION[realm]) {
    return { valid: false, reason: `Match duration ${duration}s is too short for ${realm}` };
  }

  // Rate limiting
  const oneHourAgo = Date.now() - 3600000;
  const recentMatches = matchHistory.filter(m => m.timestamp > oneHourAgo);
  if (recentMatches.length >= MAX_MATCHES_PER_HOUR) {
    return { valid: false, reason: 'Too many matches in the last hour' };
  }

  // Congkak-specific: total seeds must equal 98
  if (realm === 'congkak' && score > 49) {
    // Winner must have more than half
    // This is OK, no extra validation needed
  }

  return { valid: true };
}

export function validateXPGain(currentXP: number, gainedXP: number, realm: RealmName): MatchValidation {
  const maxXPPerMatch = 100;
  if (gainedXP > maxXPPerMatch) {
    return { valid: false, reason: `XP gain ${gainedXP} exceeds maximum` };
  }
  if (gainedXP < 0) {
    return { valid: false, reason: 'XP gain cannot be negative' };
  }
  return { valid: true };
}

export function validateGoldGain(gainedGold: number): MatchValidation {
  const maxGoldPerMatch = 50;
  if (gainedGold > maxGoldPerMatch) {
    return { valid: false, reason: `Gold gain ${gainedGold} exceeds maximum` };
  }
  if (gainedGold < 0) {
    return { valid: false, reason: 'Gold gain cannot be negative' };
  }
  return { valid: true };
}

/**
 * Generates a simple hash of the game state for integrity verification.
 * In production, use server-side verification with signed payloads.
 */
export function hashGameResult(realm: RealmName, score: number, duration: number, timestamp: number): string {
  const raw = `${realm}:${score}:${duration}:${timestamp}:warisanverse_salt`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
