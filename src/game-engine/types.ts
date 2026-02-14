import { type GameState, type MatchResult, type PlayerState, type RealmName, type GameMode } from '@/types';

// ---- RealmEngine Interface (shared by all realms) ----
export interface RealmEngine {
  realm: RealmName;
  initialize(config: GameConfig): void;
  update(deltaTime: number): void;
  end(): MatchResult;
  calculateScore(): Record<string, number>;
  getState(): unknown;
  isGameOver(): boolean;
  reset(): void;
}

export interface GameConfig {
  mode: GameMode;
  players: PlayerState[];
  difficulty?: 'easy' | 'medium' | 'hard';
  settings?: Record<string, unknown>;
}

// ---- Base Realm Engine ----
export abstract class BaseRealmEngine implements RealmEngine {
  abstract realm: RealmName;
  protected config!: GameConfig;
  protected gameState!: GameState;
  protected startTime: number = 0;
  protected _isGameOver: boolean = false;

  initialize(config: GameConfig): void {
    this.config = config;
    this.startTime = Date.now();
    this._isGameOver = false;
    this.gameState = {
      realm: this.realm,
      mode: config.mode,
      status: 'playing',
      currentTurn: 0,
      players: config.players,
      startedAt: this.startTime,
      elapsedTime: 0,
    };
    this.onInitialize(config);
  }

  update(deltaTime: number): void {
    if (this._isGameOver) return;
    this.gameState.elapsedTime = (Date.now() - this.startTime) / 1000;
    this.onUpdate(deltaTime);
    if (this.checkGameOver()) {
      this._isGameOver = true;
      this.gameState.status = 'ended';
    }
  }

  end(): MatchResult {
    this._isGameOver = true;
    this.gameState.status = 'ended';
    const scores = this.calculateScore();
    const playerIds = Object.keys(scores);
    const maxScore = Math.max(...Object.values(scores));
    const winners = playerIds.filter((id) => scores[id] === maxScore);
    const isDraw = winners.length > 1;

    return {
      winnerId: isDraw ? null : winners[0],
      scores,
      duration: Math.floor(this.gameState.elapsedTime),
      xpEarned: 0,
      goldEarned: 0,
      isDraw,
    };
  }

  isGameOver(): boolean {
    return this._isGameOver;
  }

  reset(): void {
    this._isGameOver = false;
    this.startTime = 0;
    this.onReset();
  }

  getElapsedTime(): number {
    return this.gameState.elapsedTime;
  }

  // Abstract methods for realms to implement
  protected abstract onInitialize(config: GameConfig): void;
  protected abstract onUpdate(deltaTime: number): void;
  protected abstract checkGameOver(): boolean;
  protected abstract onReset(): void;
  abstract calculateScore(): Record<string, number>;
  abstract getState(): unknown;
}
