// ============================================================
// WARISANVERSE — Shared TypeScript Types
// ============================================================

// ---- Database Types ----
export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  gold: number;
  role: "player" | "admin";
  title: string;
  total_matches: number;
  total_wins: number;
  achievements: Achievement[];
  inventory: InventoryItem[];
  settings: UserSettings;
  last_login: string | null;
  created_at: string;
}

export interface RealmProgress {
  id: string;
  user_id: string;
  realm_name: RealmName;
  wins: number;
  losses: number;
  draws: number;
  highest_score: number;
  total_games: number;
  current_streak: number;
  best_streak: number;
  rank_points: number;
  updated_at: string;
}

export interface Match {
  id: string;
  realm: RealmName;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  mode: GameMode;
  score_player1: number;
  score_player2: number;
  duration_seconds: number | null;
  match_data: Record<string, unknown>;
  status: MatchStatus;
  created_at: string;
  completed_at: string | null;
}

export interface LeaderboardEntry {
  id: string;
  user_id: string;
  season: string;
  realm: RealmName | "global";
  total_points: number;
  rank: number | null;
  tier: RankTier;
  updated_at: string;
  // Joined
  profiles?: Profile;
}

export interface Achievement {
  id: string;
  user_id: string;
  achievement_key: string;
  achievement_name: string;
  description: string;
  category: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xp_reward: number;
  gold_reward: number;
  unlocked_at: string;
}

export interface Room {
  id: string;
  realm: RealmName;
  host_id: string;
  guest_id: string | null;
  mode: GameMode;
  status: RoomStatus;
  room_code: string;
  game_state: Record<string, unknown>;
  max_players: number;
  created_at: string;
  updated_at: string;
}

export interface GameEvent {
  id: string;
  name: string;
  description: string;
  event_type: "seasonal" | "special" | "cultural";
  rewards: Record<string, unknown>;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
}

export interface LoreUnlock {
  id: string;
  user_id: string;
  lore_key: string;
  realm: RealmName | "general";
  title: string;
  content: string;
  unlocked_at: string;
}

// ---- Enums / Unions ----
export type RealmName = "congkak" | "gasing" | "batu-seremban" | "wau-bulan";
export type GameMode = "solo" | "ai" | "ranked" | "casual";
export type MatchStatus = "in_progress" | "completed" | "abandoned" | "draw";
export type RoomStatus = "waiting" | "ready" | "playing" | "finished";
export type RankTier =
  | "bronze"
  | "silver"
  | "gold"
  | "platinum"
  | "diamond"
  | "legend";

// ---- UI Types ----
export interface UserSettings {
  theme: "dark" | "light";
  sound: boolean;
  music: boolean;
}

export interface InventoryItem {
  id: string;
  name: string;
  type: "skin" | "relic" | "powercard" | "cosmetic";
  rarity: "common" | "rare" | "epic" | "legendary";
  realm?: RealmName;
  equipped?: boolean;
}

// ---- Game Engine Types ----
export interface GameState {
  realm: RealmName;
  mode: GameMode;
  status: "idle" | "initializing" | "playing" | "paused" | "ended";
  currentTurn: number;
  players: PlayerState[];
  startedAt: number;
  elapsedTime: number;
}

export interface PlayerState {
  id: string;
  username: string;
  score: number;
  isAI: boolean;
  isActive: boolean;
}

export interface MatchResult {
  winnerId: string | null;
  scores: Record<string, number>;
  duration: number;
  xpEarned: number;
  goldEarned: number;
  isDraw: boolean;
}

// ---- Realm-Specific Types ----

// Congkak — Enhanced
export type PowerCardType = 'skip_turn' | 'double_drop' | 'reverse';

export interface PowerCard {
  id: string;
  type: PowerCardType;
  name: string;
  description: string;
  icon: string;
  cost: number; // energy cost
  used: boolean;
}

export interface CongkakBoardState {
  pits: number[][]; // [player0Pits, player1Pits]
  stores: number[]; // [player0Store, player1Store]
  currentPlayer: 0 | 1;
  isGameOver: boolean;
  lastMove: number | null;
  // Enhanced features
  energy: [number, number]; // per player energy (0-100)
  combo: [number, number]; // current combo streak per player
  comboMultiplier: [number, number]; // multiplier based on combo
  powerCards: [PowerCard[], PowerCard[]]; // power cards per player
  captureHistory: CaptureEvent[];
  turnCount: number;
  lastCaptureAmount: number;
  animatingPit: number | null; // pit currently being animated
  sowingAnimation: SowStep[] | null; // active sow animation steps
}

export interface CaptureEvent {
  turn: number;
  player: number;
  pit: number;
  amount: number;
  comboLevel: number;
}

export interface SowStep {
  side: number;
  pit: number;
  seeds: number;
  isStore: boolean;
  isCapture: boolean;
  captureAmount: number;
}

// Gasing
export interface GasingState {
  spinners: GasingSpinner[];
  arenaRadius: number;
  timeRemaining: number;
  round: number;
  collisions: CollisionEvent[];
}

export interface CollisionEvent {
  x: number;
  y: number;
  force: number;
  timestamp: number;
}

export interface GasingSpinner {
  playerId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  energy: number;
  stamina: number;
  radius: number;
  mass: number;
}

// Batu Seremban
export interface BatuSerembanState {
  stones: BatuStone[];
  stage: number; // 1-7 (Buah Satu to Tujuh)
  subStage: number; // For multi-step stages (e.g. Buah Tiga: Pick 1 then 3)
  score: number;
  combo: number;
  timeWindow: number; // Time to catch
  phase: 'idle' | 'toss' | 'pick' | 'catch' | 'weighing';
  handStones: number[]; // IDs
  floorStones: number[]; // IDs
  airStone: number | null; // ID
  message: string;
}

export interface BatuStone {
  id: number;
  x: number;
  y: number;
  location: 'floor' | 'hand' | 'air';
  isSelected: boolean; // For picking
}

// Lawan Pemadam (Eraser Battle)
export interface LawanPemadamState {
  erasers: Eraser[];
  currentTurn: string; // playerId
  winnerId: string | null;
  phase: 'aiming' | 'moving' | 'resolving' | 'round_over';
  bounds: { width: number; height: number };
  match: {
    playerWins: number;
    aiWins: number;
    targetWins: number; // e.g., 2 wins for Bo3
    currentRound: number;
  };
}

export interface Eraser {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  vx: number;
  vy: number;
  vr: number;
  z: number; // Height (3D jump)
  vz: number; // Vertical Z velocity
  rotationX: number; // Flip rotation
  flag: string; // image path or code
  isDead: boolean;
}

// Lari Dalam Guni
export interface LariGuniState {
  players: LariGuniPlayer[];
  finishLineX: number; // e.g., 2000
  isRaceActive: boolean;
  timeLeft: number;
  winnerId: string | null;
  cameraX: number;
}

export interface LariGuniPlayer {
  id: string;
  x: number; // Horizontal position
  y: number; // Vertical height (0 = ground, >0 = air)
  vy: number; // Vertical velocity
  vx: number; // Horizontal velocity
  state: 'idle' | 'charging' | 'jumping' | 'falling' | 'finished';
  charge: number; // 0-100 jump power
  isAI: boolean;
  name: string;
  color: string;
}

// Tuju Guli (Marble Game)
export interface TujuGuliState {
  marbles: Marble[]; // Target marbles
  strikers: Marble[]; // Player strikers
  currentTurn: string; // playerId
  phase: 'aiming' | 'moving' | 'resolving';
  scores: Record<string, number>;
  winnerId: string | null;
  arenaRadius: number;
}

export interface Marble {
  id: string;
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string; // Hex or texture ID
  isDead: boolean;
  ownerId?: string; // If striker
}

// ---- Gamification ----
export interface LevelInfo {
  level: number;
  currentXP: number;
  requiredXP: number;
  progress: number;
  title: string;
}

export interface SeasonPass {
  season: string;
  currentLevel: number;
  maxLevel: number;
  rewards: SeasonReward[];
}

export interface SeasonReward {
  level: number;
  type: "gold" | "skin" | "relic" | "title" | "xp_boost";
  name: string;
  claimed: boolean;
  isPremium: boolean;
}

// ---- Achievement Definitions ----
export interface AchievementDefinition {
  key: string;
  name: string;
  description: string;
  category: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  xpReward: number;
  goldReward: number;
  icon: string;
  condition: (profile: Profile, progress: RealmProgress[]) => boolean;
}
