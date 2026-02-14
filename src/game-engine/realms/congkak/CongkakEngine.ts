import { type CongkakBoardState, type PowerCard, type PowerCardType, type CaptureEvent, type SowStep } from '@/types';
import { BaseRealmEngine, type GameConfig } from '../../types';
import { CONGKAK_PITS, CONGKAK_SEEDS_PER_PIT } from '@/lib/constants';

const ENERGY_PER_MOVE = 8;
const ENERGY_PER_CAPTURE = 15;
const ENERGY_REGEN_PER_TURN = 5;
const COMBO_DECAY_TURNS = 2;
const MAX_ENERGY = 100;

function createDefaultPowerCards(): PowerCard[] {
  return [
    {
      id: 'skip_1',
      type: 'skip_turn',
      name: 'Skip Turn',
      description: 'Skip your opponent\'s next turn',
      icon: '⏭️',
      cost: 35,
      used: false,
    },
    {
      id: 'double_1',
      type: 'double_drop',
      name: 'Double Drop',
      description: 'Drop 2 seeds per pit instead of 1',
      icon: '✨',
      cost: 25,
      used: false,
    },
    {
      id: 'reverse_1',
      type: 'reverse',
      name: 'Reverse',
      description: 'Sow seeds in reverse direction',
      icon: '🔄',
      cost: 20,
      used: false,
    },
  ];
}

export class CongkakEngine extends BaseRealmEngine {
  realm = 'congkak' as const;
  private board!: CongkakBoardState;
  private moveHistory: { player: number; pit: number; captured: number }[] = [];
  private lastComboTurn: [number, number] = [0, 0]; // track when last combo happened
  private activePowerCard: PowerCardType | null = null;
  private skipNextTurn: boolean = false;

  protected onInitialize(config: GameConfig): void {
    this.board = this.createInitialBoard(config.mode);
    this.moveHistory = [];
    this.lastComboTurn = [0, 0];
    this.activePowerCard = null;
    this.skipNextTurn = false;
  }

  private createInitialBoard(mode: string): CongkakBoardState {
    const includeCards = mode !== 'casual';
    return {
      pits: [
        Array(CONGKAK_PITS).fill(CONGKAK_SEEDS_PER_PIT),
        Array(CONGKAK_PITS).fill(CONGKAK_SEEDS_PER_PIT),
      ],
      stores: [0, 0],
      currentPlayer: 0,
      isGameOver: false,
      lastMove: null,
      energy: [MAX_ENERGY, MAX_ENERGY],
      combo: [0, 0],
      comboMultiplier: [1, 1],
      powerCards: [
        includeCards ? createDefaultPowerCards() : [],
        includeCards ? createDefaultPowerCards() : [],
      ],
      captureHistory: [],
      turnCount: 0,
      lastCaptureAmount: 0,
      animatingPit: null,
      sowingAnimation: null,
    };
  }

  getState(): CongkakBoardState {
    return {
      ...this.board,
      pits: [
        [...this.board.pits[0]],
        [...this.board.pits[1]],
      ],
      stores: [...this.board.stores],
      energy: [...this.board.energy] as [number, number],
      combo: [...this.board.combo] as [number, number],
      comboMultiplier: [...this.board.comboMultiplier] as [number, number],
      powerCards: [
        this.board.powerCards[0].map(c => ({ ...c })),
        this.board.powerCards[1].map(c => ({ ...c })),
      ],
      captureHistory: [...this.board.captureHistory],
    };
  }

  // Use a power card before making a move
  usePowerCard(cardId: string): boolean {
    const player = this.board.currentPlayer;
    const card = this.board.powerCards[player].find(c => c.id === cardId && !c.used);
    if (!card) return false;
    if (this.board.energy[player] < card.cost) return false;

    this.board.energy[player] -= card.cost;
    card.used = true;
    this.activePowerCard = card.type;
    return true;
  }

  // Core game logic: sow seeds from a pit
  makeMove(pitIndex: number): boolean {
    const player = this.board.currentPlayer;

    // Validate move
    if (pitIndex < 0 || pitIndex >= CONGKAK_PITS) return false;
    if (this.board.pits[player][pitIndex] === 0) return false;
    if (this._isGameOver) return false;

    // Energy cost
    const energyCost = ENERGY_PER_MOVE;
    // Don't block move if low energy, but drain it
    this.board.energy[player] = Math.max(0, this.board.energy[player] - energyCost);

    // Pick up seeds
    let seeds = this.board.pits[player][pitIndex];
    this.board.pits[player][pitIndex] = 0;
    
    // Safety break for infinite loops (e.g. excessive "Berjalan")
    let loopCount = 0;
    const MAX_LOOP_STEPS = 500;

    const isReverse = this.activePowerCard === 'reverse';
    const isDoubleDrop = this.activePowerCard === 'double_drop';

    let currentSide = player;
    let currentPit = isReverse ? pitIndex - 1 : pitIndex + 1;
    let captured = 0;
    let lastLandedInStore = false;

    // Build sow animation steps
    const sowSteps: SowStep[] = [];

    // Sow seeds
    while (seeds > 0) {
      if (loopCount++ > MAX_LOOP_STEPS) {
        console.warn('Max loop steps reached, forcing turn end to prevent crash.');
        break;
      }

      lastLandedInStore = false;

      // Handle boundary wrapping for reverse
      if (isReverse && currentPit < 0) {
        if (currentSide === player) {
          // Own store
          this.board.stores[player]++;
          seeds--;
          sowSteps.push({ side: player, pit: -1, seeds: this.board.stores[player], isStore: true, isCapture: false, captureAmount: 0 });
          if (seeds === 0) lastLandedInStore = true;
          currentSide = 1 - currentSide;
          currentPit = CONGKAK_PITS - 1;
          continue;
        } else {
          currentSide = 1 - currentSide;
          currentPit = CONGKAK_PITS - 1;
          continue;
        }
      }

      if (!isReverse && currentPit >= CONGKAK_PITS) {
        if (currentSide === player) {
          this.board.stores[player]++;
          seeds--;
          sowSteps.push({ side: player, pit: -1, seeds: this.board.stores[player], isStore: true, isCapture: false, captureAmount: 0 });
          if (seeds === 0) lastLandedInStore = true;
          currentSide = 1 - currentSide;
          currentPit = 0;
          continue;
        } else {
          currentSide = 1 - currentSide;
          currentPit = 0;
          continue;
        }
      }

      // Drop seed(s)
      const dropCount = isDoubleDrop && seeds >= 2 ? 2 : 1;
      this.board.pits[currentSide][currentPit] += dropCount;
      seeds -= dropCount;

      sowSteps.push({
        side: currentSide,
        pit: currentPit,
        seeds: this.board.pits[currentSide][currentPit],
        isStore: false,
        isCapture: false,
        captureAmount: 0,
      });

      // Special Rules Check (Only when hand is empty)
      if (seeds === 0) {
        // 1. Check for "Berjalan" (Continuing) - Landed in own/opponent pit that is NON-empty (count > dropCount means it had seeds)
        // Note: We just dropped `dropCount` seeds. So if pit has > dropCount, it wasn't empty.
        // Rule: "If your last seed lands in a house that already has seeds, pick all of them up and continue"
        // This applies to BOTH sides? Yes, standard Congkak allows running on opponent side too until you die.
        
        if (this.board.pits[currentSide][currentPit] > dropCount) {
          // Pick up all seeds
          seeds = this.board.pits[currentSide][currentPit];
          this.board.pits[currentSide][currentPit] = 0;
          
          // Visual step for pick up
          sowSteps.push({
            side: currentSide,
            pit: currentPit,
            seeds: 0,
            isStore: false,
            isCapture: false,
            captureAmount: 0,
          });
          
          // Continue loop (sowing from next pit)
          // We need to advance `currentPit` before continuing loop logic
        } else if (currentSide === player && this.board.pits[currentSide][currentPit] === dropCount) {
          // 2. Check for Capture (Menembak) - Landed in OWN empty pit
          // Pit was empty (now has dropCount).
          const oppositePit = CONGKAK_PITS - 1 - currentPit;
          const opponentSide = 1 - player;
          if (this.board.pits[opponentSide][oppositePit] > 0) {
            const capturedSeeds = this.board.pits[opponentSide][oppositePit] + dropCount;

            // Apply combo multiplier
            const comboMult = this.board.comboMultiplier[player];
            const finalCapture = Math.floor(capturedSeeds * comboMult);

            this.board.stores[player] += finalCapture;
            this.board.pits[opponentSide][oppositePit] = 0;
            this.board.pits[currentSide][currentPit] = 0;
            captured = finalCapture;

            // Energy bonus for capture
            this.board.energy[player] = Math.min(MAX_ENERGY, this.board.energy[player] + ENERGY_PER_CAPTURE);

            // Update combo
            this.board.combo[player]++;
            this.lastComboTurn[player] = this.board.turnCount;
            this.board.comboMultiplier[player] = 1 + this.board.combo[player] * 0.25;

            // Record capture event
            this.board.captureHistory.push({
              turn: this.board.turnCount,
              player,
              pit: currentPit,
              amount: finalCapture,
              comboLevel: this.board.combo[player],
            });

            this.board.lastCaptureAmount = finalCapture;

            // Update last sow step to show capture
            // We modify the last step to be a capture step
            // But visually we also clear the opponent pit.
            // My animateTurn logic handles `isCapture` by clearing both pits.
            // So we just mark it.
            sowSteps[sowSteps.length - 1].isCapture = true;
            sowSteps[sowSteps.length - 1].captureAmount = finalCapture;
          }
        }
        // Else: Landed in empty pit on opponent side -> Mati (Dead). Seeds=0, loop ends.
      }

      if (seeds > 0) {
        if (isReverse) {
          currentPit--;
        } else {
          currentPit++;
        }
      }
    }

    // Decay combo if no capture this turn and gap > threshold
    if (captured === 0) {
      const turnsSinceCombo = this.board.turnCount - this.lastComboTurn[player];
      if (turnsSinceCombo >= COMBO_DECAY_TURNS && this.board.combo[player] > 0) {
        this.board.combo[player] = Math.max(0, this.board.combo[player] - 1);
        this.board.comboMultiplier[player] = 1 + this.board.combo[player] * 0.25;
      }
    }

    // Energy regen
    this.board.energy[player] = Math.min(MAX_ENERGY, this.board.energy[player] + ENERGY_REGEN_PER_TURN);

    this.moveHistory.push({ player, pit: pitIndex, captured });
    this.board.lastMove = pitIndex;
    this.board.turnCount++;
    this.board.sowingAnimation = sowSteps;

    // Clear active power card
    this.activePowerCard = null;

    // Check if game is over
    if (this.checkGameOver()) {
      this._isGameOver = true;
      this.board.isGameOver = true;
      this.collectRemainingSeeds();
    } else if (this.skipNextTurn) {
      // Skip opponent's turn (power card effect)
      this.skipNextTurn = false;
      // Player keeps the turn
    } else if (!lastLandedInStore) {
      this.board.currentPlayer = (1 - player) as 0 | 1;
    }
    // If last seed landed in own store, current player gets extra turn

    // Check if skip_turn card was used — schedule skip for next opponent turn
    if (this.activePowerCard === 'skip_turn') {
      this.skipNextTurn = true;
    }

    return true;
  }

  // Use skip_turn card effect
  activateSkipTurn(): void {
    this.skipNextTurn = true;
  }

  private collectRemainingSeeds(): void {
    for (let p = 0; p < 2; p++) {
      for (let i = 0; i < CONGKAK_PITS; i++) {
        this.board.stores[p] += this.board.pits[p][i];
        this.board.pits[p][i] = 0;
      }
    }
  }

  protected checkGameOver(): boolean {
    for (let p = 0; p < 2; p++) {
      if (this.board.pits[p].every((seeds) => seeds === 0)) {
        return true;
      }
    }
    return false;
  }

  calculateScore(): Record<string, number> {
    const players = this.config.players;
    const scores: Record<string, number> = {};
    players.forEach((p, i) => {
      scores[p.id] = this.board.stores[i] || 0;
    });
    return scores;
  }

  getValidMoves(): number[] {
    const player = this.board.currentPlayer;
    const moves: number[] = [];
    for (let i = 0; i < CONGKAK_PITS; i++) {
      if (this.board.pits[player][i] > 0) {
        moves.push(i);
      }
    }
    return moves;
  }

  getCurrentPlayer(): number {
    return this.board.currentPlayer;
  }

  getMoveHistory() {
    return [...this.moveHistory];
  }

  getEnergy(player: number): number {
    return this.board.energy[player] || 0;
  }

  getCombo(player: number): number {
    return this.board.combo[player] || 0;
  }

  getComboMultiplier(player: number): number {
    return this.board.comboMultiplier[player] || 1;
  }

  protected onUpdate(): void {
    // Turn-based game, no continuous updates needed
  }

  protected onReset(): void {
    this.board = this.createInitialBoard(this.config.mode);
    this.moveHistory = [];
    this.lastComboTurn = [0, 0];
    this.activePowerCard = null;
    this.skipNextTurn = false;
  }
}
