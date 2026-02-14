-- ============================================================
-- WARISANVERSE — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  gold INTEGER DEFAULT 100,
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'admin')),
  title TEXT DEFAULT 'Newcomer',
  total_matches INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  achievements JSONB DEFAULT '[]'::jsonb,
  inventory JSONB DEFAULT '[]'::jsonb,
  settings JSONB DEFAULT '{"theme": "dark", "sound": true, "music": true}'::jsonb,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REALMS PROGRESS
-- ============================================================
CREATE TABLE public.realms_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  realm_name TEXT NOT NULL CHECK (realm_name IN ('congkak', 'gasing', 'batu-seremban', 'wau-bulan')),
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  rank_points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, realm_name)
);

-- ============================================================
-- MATCHES
-- ============================================================
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  realm TEXT NOT NULL CHECK (realm IN ('congkak', 'gasing', 'batu-seremban', 'wau-bulan')),
  player1_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  player2_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mode TEXT NOT NULL CHECK (mode IN ('solo', 'ai', 'ranked', 'casual', 'tournament')),
  score_player1 INTEGER DEFAULT 0,
  score_player2 INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  match_data JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned', 'draw')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================
-- LEADERBOARD
-- ============================================================
CREATE TABLE public.leaderboard (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  season TEXT NOT NULL DEFAULT 'season_1',
  realm TEXT CHECK (realm IN ('congkak', 'gasing', 'batu-seremban', 'wau-bulan', 'global')),
  total_points INTEGER DEFAULT 0,
  rank INTEGER,
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond', 'legend')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, season, realm)
);

-- ============================================================
-- ACHIEVEMENTS
-- ============================================================
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_key TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  xp_reward INTEGER DEFAULT 0,
  gold_reward INTEGER DEFAULT 0,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_key)
);

-- ============================================================
-- ROOMS (Multiplayer)
-- ============================================================
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  realm TEXT NOT NULL CHECK (realm IN ('congkak', 'gasing', 'batu-seremban', 'wau-bulan')),
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  mode TEXT DEFAULT 'casual' CHECK (mode IN ('casual', 'ranked', 'tournament')),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'playing', 'finished')),
  room_code TEXT UNIQUE,
  game_state JSONB DEFAULT '{}'::jsonb,
  max_players INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- EVENTS (Global Events System)
-- ============================================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT DEFAULT 'seasonal' CHECK (event_type IN ('seasonal', 'special', 'tournament', 'cultural')),
  rewards JSONB DEFAULT '{}'::jsonb,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LORE UNLOCKS
-- ============================================================
CREATE TABLE public.lore_unlocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  lore_key TEXT NOT NULL,
  realm TEXT CHECK (realm IN ('congkak', 'gasing', 'batu-seremban', 'wau-bulan', 'general')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lore_key)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Realms Progress
ALTER TABLE public.realms_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Progress viewable by everyone"
  ON public.realms_progress FOR SELECT USING (true);

CREATE POLICY "Users can insert own progress"
  ON public.realms_progress FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.realms_progress FOR UPDATE USING (auth.uid() = user_id);

-- Matches
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Matches viewable by everyone"
  ON public.matches FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create matches"
  ON public.matches FOR INSERT WITH CHECK (auth.uid() = player1_id);

CREATE POLICY "Players can update their matches"
  ON public.matches FOR UPDATE USING (
    auth.uid() = player1_id OR auth.uid() = player2_id
  );

-- Leaderboard
ALTER TABLE public.leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard viewable by everyone"
  ON public.leaderboard FOR SELECT USING (true);

CREATE POLICY "Users can manage own leaderboard entries"
  ON public.leaderboard FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leaderboard"
  ON public.leaderboard FOR UPDATE USING (auth.uid() = user_id);

-- Achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements viewable by everyone"
  ON public.achievements FOR SELECT USING (true);

CREATE POLICY "Users can unlock achievements"
  ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Rooms
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rooms viewable by everyone"
  ON public.rooms FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON public.rooms FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Room participants can update"
  ON public.rooms FOR UPDATE USING (
    auth.uid() = host_id OR auth.uid() = guest_id
  );

CREATE POLICY "Host can delete rooms"
  ON public.rooms FOR DELETE USING (auth.uid() = host_id);

-- Events (admin only insert/update)
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Events viewable by everyone"
  ON public.events FOR SELECT USING (true);

-- Lore Unlocks
ALTER TABLE public.lore_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lore"
  ON public.lore_unlocks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can unlock lore"
  ON public.lore_unlocks FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leaderboard;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'player_' || LEFT(NEW.id::text, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Initialize realm progress for new user
CREATE OR REPLACE FUNCTION public.init_realm_progress()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.realms_progress (user_id, realm_name) VALUES
    (NEW.id, 'congkak'),
    (NEW.id, 'gasing'),
    (NEW.id, 'batu-seremban'),
    (NEW.id, 'wau-bulan');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.init_realm_progress();

-- Update leaderboard rank function
CREATE OR REPLACE FUNCTION public.update_leaderboard_ranks()
RETURNS VOID AS $$
BEGIN
  UPDATE public.leaderboard l
  SET rank = sub.new_rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY season, realm ORDER BY total_points DESC
    ) AS new_rank
    FROM public.leaderboard
  ) sub
  WHERE l.id = sub.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
