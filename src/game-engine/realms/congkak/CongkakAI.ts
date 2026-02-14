import { CongkakEngine } from './CongkakEngine';
import { CONGKAK_PITS } from '@/lib/constants';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export class CongkakAI {
  private difficulty: AIDifficulty;

  constructor(difficulty: AIDifficulty = 'medium') {
    this.difficulty = difficulty;
  }

  getBestMove(engine: CongkakEngine): number {
    const validMoves = engine.getValidMoves();
    if (validMoves.length === 0) return -1;

    switch (this.difficulty) {
      case 'easy':
        return this.randomMove(validMoves);
      case 'medium':
        return this.greedyMove(engine, validMoves);
      case 'hard':
        return this.minimaxMove(engine, validMoves);
      default:
        return this.randomMove(validMoves);
    }
  }

  /** AI considers using power cards (medium/hard only) */
  shouldUsePowerCard(engine: CongkakEngine): string | null {
    if (this.difficulty === 'easy') return null;

    const state = engine.getState();
    const aiPlayer = state.currentPlayer;
    const cards = state.powerCards[aiPlayer].filter(c => !c.used);
    const energy = state.energy[aiPlayer];

    for (const card of cards) {
      if (energy < card.cost) continue;

      switch (card.type) {
        case 'skip_turn':
          // Use skip when opponent has strong position
          const oppStore = state.stores[1 - aiPlayer];
          const myStore = state.stores[aiPlayer];
          if (oppStore > myStore + 10 && this.difficulty === 'hard') {
            return card.id;
          }
          break;
        case 'double_drop':
          // Use when a move has many seeds (maximize distribution)
          const validMoves = engine.getValidMoves();
          const maxSeeds = Math.max(...validMoves.map(m => state.pits[aiPlayer][m]));
          if (maxSeeds >= 10) return card.id;
          break;
        case 'reverse':
          // Use randomly on hard, ignore on medium
          if (this.difficulty === 'hard' && Math.random() < 0.15) {
            return card.id;
          }
          break;
      }
    }

    return null;
  }

  private randomMove(validMoves: number[]): number {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  private greedyMove(engine: CongkakEngine, validMoves: number[]): number {
    let bestMove = validMoves[0];
    let bestScore = -Infinity;

    for (const move of validMoves) {
      const score = this.evaluateMove(engine, move);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private evaluateMove(engine: CongkakEngine, pitIndex: number): number {
    const state = engine.getState();
    const player = state.currentPlayer;
    const seeds = state.pits[player][pitIndex];

    let score = 0;

    // Prefer moves that give extra turns (landing in own store)
    const totalPits = pitIndex + seeds;
    if (totalPits === CONGKAK_PITS) {
      score += 15;
    }

    // Prefer moves that capture opponent seeds
    let endPit = (pitIndex + seeds) % (CONGKAK_PITS * 2 + 1);
    if (endPit < CONGKAK_PITS && state.pits[player][endPit] === 0) {
      const oppPit = CONGKAK_PITS - 1 - endPit;
      const captureValue = state.pits[1 - player][oppPit];
      // Apply combo multiplier awareness
      score += captureValue * state.comboMultiplier[player];
    }

    // Prefer building combos (bonus for consecutive captures)
    if (state.combo[player] > 0) {
      score += state.combo[player] * 3;
    }

    // Energy-aware: prefer moves when energy is high
    if (state.energy[player] > 60) {
      score += 2;
    }

    // Prefer pits with more seeds
    score += seeds * 0.5;

    // Randomness for variety
    score += Math.random() * 2;

    return score;
  }

  private minimaxMove(engine: CongkakEngine, validMoves: number[]): number {
    let bestMove = validMoves[0];
    let bestScore = -Infinity;
    const depth = 4;

    for (const move of validMoves) {
      const clonedEngine = this.cloneEngine(engine);
      clonedEngine.makeMove(move);
      const score = this.minimax(clonedEngine, depth - 1, false, -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }

    return bestMove;
  }

  private minimax(
    engine: CongkakEngine,
    depth: number,
    isMaximizing: boolean,
    alpha: number,
    beta: number
  ): number {
    if (depth === 0 || engine.isGameOver()) {
      return this.evaluateBoard(engine);
    }

    const validMoves = engine.getValidMoves();
    if (validMoves.length === 0) return this.evaluateBoard(engine);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of validMoves) {
        const cloned = this.cloneEngine(engine);
        const prevPlayer = cloned.getCurrentPlayer();
        cloned.makeMove(move);
        const samePlayer = cloned.getCurrentPlayer() === prevPlayer;
        const evaluation = this.minimax(cloned, depth - 1, samePlayer, alpha, beta);
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of validMoves) {
        const cloned = this.cloneEngine(engine);
        const prevPlayer = cloned.getCurrentPlayer();
        cloned.makeMove(move);
        const samePlayer = cloned.getCurrentPlayer() === prevPlayer;
        const evaluation = this.minimax(cloned, depth - 1, !samePlayer, alpha, beta);
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  private evaluateBoard(engine: CongkakEngine): number {
    const state = engine.getState();
    // AI is always player 1
    let score = state.stores[1] - state.stores[0];
    // Factor in combo advantage
    score += (state.combo[1] - state.combo[0]) * 2;
    // Factor in energy advantage
    score += (state.energy[1] - state.energy[0]) * 0.05;
    return score;
  }

  private cloneEngine(engine: CongkakEngine): CongkakEngine {
    const newEngine = new CongkakEngine();
    const config = {
      mode: 'ai' as const,
      players: [
        { id: 'player', username: 'Player', score: 0, isAI: false, isActive: true },
        { id: 'ai', username: 'AI', score: 0, isAI: true, isActive: true },
      ],
    };
    newEngine.initialize(config);

    // Deep copy state
    const state = engine.getState();
    const newState = newEngine.getState();
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < state.pits[p].length; i++) {
        newState.pits[p][i] = state.pits[p][i];
      }
      newState.stores[p] = state.stores[p];
    }
    newState.currentPlayer = state.currentPlayer;
    return newEngine;
  }
}
