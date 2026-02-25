import { TekaSilangKataState, CrosswordLevel, MatchResult } from "@/types";
import { BaseRealmEngine, GameConfig } from "../../types";
import { CROSSWORD_LEVELS } from "./levels";
import { CROSSWORD_EXP_PER_WORD, CROSSWORD_EXP_LEVEL_BONUS } from "@/lib/constants";

export class TekaSilangKataEngine extends BaseRealmEngine {
  realm = 'teka-silang-kata' as const;
  private state!: TekaSilangKataState;
  private currentLevel!: CrosswordLevel;

  protected onInitialize(config: GameConfig): void {
    const levelId = (config.settings?.levelId as string) || 'level_1';
    this.currentLevel = CROSSWORD_LEVELS.find(l => l.id === levelId) || CROSSWORD_LEVELS[0];

    // Initialize empty grid
    const grid = Array(this.currentLevel.size).fill(null).map(() => 
      Array(this.currentLevel.size).fill('')
    );

    this.state = {
      levelId: this.currentLevel.id,
      grid: grid,
      completedWords: [],
      isGameOver: false,
      score: 0,
      timeLeft: this.currentLevel.timeLimit
    };
  }

  protected onUpdate(deltaTime: number): void {
    if (this._isGameOver) return;

    this.state.timeLeft -= deltaTime;
    if (this.state.timeLeft <= 0) {
      this.state.timeLeft = 0;
      this._isGameOver = true;
      this.state.isGameOver = true;
    }
  }

  // Update a single cell in the grid
  updateCell(row: number, col: number, char: string): void {
    if (this._isGameOver) return;
    
    const uppercaseChar = char.toUpperCase().slice(0, 1);
    this.state.grid[row][col] = uppercaseChar;

    this.checkWords();
  }

  // Check if any words have been completed
  private checkWords(): void {
    this.currentLevel.words.forEach(word => {
      if (this.state.completedWords.includes(word.id)) return;

      let currentAttempt = '';
      for (let i = 0; i < word.length; i++) {
        const r = word.direction === 'across' ? word.row : word.row + i;
        const c = word.direction === 'across' ? word.col + i : word.col;
        currentAttempt += this.state.grid[r][c];
      }

      if (currentAttempt === word.answer) {
        this.state.completedWords.push(word.id);
        this.state.score += 100; // 100 points per word
        
        // Check if all words completed
        if (this.state.completedWords.length === this.currentLevel.words.length) {
          this._isGameOver = true;
          this.state.isGameOver = true;
        }
      }
    });
  }

  protected checkGameOver(): boolean {
    return this.state.isGameOver;
  }

  calculateScore(): Record<string, number> {
    const playerId = this.config.players[0]?.id || 'local';
    return {
      [playerId]: this.state.score
    };
  }

  end(): MatchResult {
    const res = super.end();
    
    // Calculate EXP
    // 5 EXP per word + 50 bonus for completing level
    let xpEarned = this.state.completedWords.length * CROSSWORD_EXP_PER_WORD;
    if (this.state.completedWords.length === this.currentLevel.words.length) {
      xpEarned += CROSSWORD_EXP_LEVEL_BONUS;
    }

    return {
      ...res,
      xpEarned,
      goldEarned: Math.floor(this.state.score / 10),
    };
  }

  getState(): TekaSilangKataState {
    return { ...this.state };
  }

  protected onReset(): void {
    this.onInitialize(this.config);
  }
}
