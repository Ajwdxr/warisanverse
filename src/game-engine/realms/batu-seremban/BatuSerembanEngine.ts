import { type BatuSerembanState, type BatuStone } from '@/types';
import { BaseRealmEngine, type GameConfig } from '../../types';
import { randomRange } from '@/lib/utils';

export class BatuSerembanEngine extends BaseRealmEngine {
  realm = 'batu-seremban' as const;
  private state!: BatuSerembanState;
  
  // Physics
  private readonly GRAVITY = 2000; // Stronger gravity for "snappy" feel
  private readonly TOSS_VELOCITY_Y = -950; // Higher throw
  private readonly FLOOR_Y = 500;
  private readonly HAND_Y = 550;
  private readonly WALL_LEFT = 50;
  private readonly WALL_RIGHT = 550;

  private stoneVelocities: Record<number, { vx: number; vy: number }> = {};
  private canCatchTime = 0;

  protected onInitialize(config: GameConfig): void {
    this.resetGame();
  }

  resetGame() {
    this.state = {
      stones: Array.from({ length: 5 }, (_, i) => ({
        id: i,
        x: 0, 
        y: 0,
        location: 'floor',
        isSelected: false
      })),
      stage: 1,
      subStage: 0, // 0 = not started, 1 = in progress
      score: 0,
      combo: 0,
      timeWindow: 0,
      phase: 'toss', // Start by scattering? No, start by scattering logic
      handStones: [],
      floorStones: [0, 1, 2, 3, 4],
      airStone: null,
      message: 'Click to Scatter Stones!',
    };
    this.scatterStones();
  }

  scatterStones() {
    // Randomize floor positions
    this.state.stones.forEach(s => {
      s.x = randomRange(50, 550);
      s.y = randomRange(300, 450);
      s.location = 'floor';
      s.isSelected = false;
    });
    this.state.floorStones = [0, 1, 2, 3, 4];
    this.state.handStones = [];
    this.state.airStone = null;
    this.state.phase = 'idle';
    this.state.message = `Buah ${this.getStageName(this.state.stage)}: Pick a stone to start!`;
  }

  getStageName(stage: number): string {
    const names = ['Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh'];
    return names[stage - 1] || 'Satu';
  }

  getState(): BatuSerembanState {
    return {
      ...this.state,
      stones: this.state.stones.map(s => ({ ...s })),
      handStones: [...this.state.handStones],
      floorStones: [...this.state.floorStones],
    };
  }

  // Determine required picks based on stage
  getRequiredPicks(): number {
    switch (this.state.stage) {
      case 1: return 1;
      case 2: return 2;
      case 3: return this.state.subStage === 0 ? 1 : 3;
      case 4: return 4;
      case 5: return 4; // Special logic handled in phase
      default: return 1;
    }
  }

  handleClick(stoneId: number): void {
    const stone = this.state.stones[stoneId];
    
    // 1. Initial Pickup (Start of round)
    if (this.state.handStones.length === 0 && stone.location === 'floor') {
      this.pickupStone(stoneId);
      this.state.message = 'Click Hand Stone to Toss!';
      return;
    }

    // 2. Toss (Click Hand Stone)
    if (this.state.phase === 'idle' && stone.location === 'hand') {
      this.tossStone(stoneId);
      return;
    }

    // 3. Pick Floor Stone (While Airborne)
    if (this.state.phase === 'pick' && stone.location === 'floor') {
       if (!stone.isSelected) {
         stone.isSelected = true;
         // Check if we picked enough? No, wait for Catch.
       } else {
         stone.isSelected = false; // Deselect
       }
       return;
    }

    // 4. Catch (Click Air Stone)
    if (this.state.phase === 'pick' && stone.location === 'air') {
      if (Date.now() < this.canCatchTime) return; // Prevent accidental double-click catch
      this.attemptCatch();
      return;
    }
  }

  pickupStone(id: number) {
    const s = this.state.stones[id];
    s.location = 'hand';
    s.y = this.HAND_Y;
    s.x = 300; // Center hand
    this.state.handStones.push(id);
    this.state.floorStones = this.state.floorStones.filter(i => i !== id);
  }

  tossStone(id: number) {
    const s = this.state.stones[id];
    s.location = 'air';
    this.state.airStone = id;
    this.state.handStones = this.state.handStones.filter(i => i !== id);
    this.state.phase = 'pick';
    this.canCatchTime = Date.now() + 500; // 500ms grace period
    
    // Physics Init with small random arc
    this.stoneVelocities[id] = {
        vy: this.TOSS_VELOCITY_Y,
        vx: randomRange(-100, 100) // Random horizontal drift, e.g. -100 to 100
    };
  }

  attemptCatch() {
    const airId = this.state.airStone;
    if (airId === null) return;

    // Validate Picks
    const selected = this.state.stones.filter(s => s.isSelected && s.location === 'floor');
    const needed = this.getRequiredPicks();

    if (selected.length === needed) {
      // Success!
      // Move Air -> Hand
      this.pickupStone(airId);
      // Move Selected -> Hand
      selected.forEach(s => {
        s.isSelected = false;
        this.pickupStone(s.id);
      });
      
      this.state.score += 10 * needed;
      this.state.airStone = null;
      this.state.phase = 'idle';
      this.state.message = 'Caught! Toss again.';

      // Check Stage Completion
      if (this.state.floorStones.length === 0) {
        this.nextStage();
      } else if (this.state.stage === 3) {
         this.state.subStage++; // Move to pick 3
      }
    } else {
      // Failed (Wrong count)
      this.triggerFail('Mati! Wrong number of stones.');
    }
  }

  nextStage() {
    if (this.state.stage >= 7) {
      this.state.message = 'You Win! All Buah Completed!';
      this._isGameOver = true;
      return;
    }
    this.state.stage++;
    this.state.subStage = 0;
    this.state.message = `Buah ${this.getStageName(this.state.stage)} Completed! Next Stage...`;
    
    // Reset for next stage
    setTimeout(() => {
       this.scatterStones();
    }, 1500);
  }

  triggerFail(reason: string) {
    this.state.message = reason;
    this.state.phase = 'idle'; // Stop physics
    // Drop air stone
    if (this.state.airStone !== null) {
        this.state.stones[this.state.airStone].location = 'floor';
        this.state.stones[this.state.airStone].y = this.FLOOR_Y;
    }
    this.state.airStone = null;
    
    // Reset current stage?
    setTimeout(() => {
      this.scatterStones(); // Retry stage
    }, 1500);
  }

  protected onUpdate(deltaTime: number): void {
    if (this.state.phase !== 'pick' || this.state.airStone === null) return;
    
    const dt = deltaTime / 1000;
    const id = this.state.airStone;
    const s = this.state.stones[id];
    const v = this.stoneVelocities[id] || { vx: 0, vy: 0 };

    // Physics
    v.vy += this.GRAVITY * dt;
    s.y += v.vy * dt;
    s.x += v.vx * dt;

    // Wall Bounce
    if (s.x < this.WALL_LEFT) { s.x = this.WALL_LEFT; v.vx *= -0.6; }
    if (s.x > this.WALL_RIGHT) { s.x = this.WALL_RIGHT; v.vx *= -0.6; }

    this.stoneVelocities[id] = v;

    // Check Floor Hit (Fail)
    if (s.y > this.FLOOR_Y) {
      s.y = this.FLOOR_Y;
      this.state.airStone = null;
      s.location = 'floor';
      this.triggerFail('Mati! Dropped the stone.');
    }
  }

  // Required abstract methods
  protected checkGameOver(): boolean { return this._isGameOver; }
  calculateScore(): Record<string, number> { return { [this.config.players[0]?.id || 'player']: this.state.score }; }
  protected onReset(): void { this.resetGame(); }
}
