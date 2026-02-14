-- ============================================================
-- RESET GAME DATA (FULL CLEANUP)
-- Run this script in your Supabase SQL Editor to clear ALL game history and stats.
-- This will reset everyone to Level 1 and remove all match records.
-- ============================================================

BEGIN;

-- 1. Clear Match History & Rankings
TRUNCATE TABLE public.matches CASCADE;
TRUNCATE TABLE public.leaderboard CASCADE;
TRUNCATE TABLE public.rooms CASCADE;
TRUNCATE TABLE public.achievements CASCADE;
TRUNCATE TABLE public.lore_unlocks CASCADE;

-- 2. Reset Realm Progress (Wins/Losses/Streaks) for ALL users
UPDATE public.realms_progress 
SET wins = 0, 
    losses = 0, 
    draws = 0, 
    highest_score = 0, 
    total_games = 0, 
    current_streak = 0, 
    best_streak = 0, 
    rank_points = 0;

-- 3. Reset User Profiles Stats (Level, XP, Gold, Total Matches)
-- This ensures the dashboard stats match the cleared history.
UPDATE public.profiles
SET level = 1,
    xp = 0,
    gold = 100,
    total_matches = 0,
    total_wins = 0,
    achievements = '[]'::jsonb,
    inventory = '[]'::jsonb,
    title = 'Newcomer';

COMMIT;

-- Done! Params reset to 0.
