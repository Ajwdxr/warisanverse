import { BaseRealmEngine, type GameConfig } from '../../types';
import { type LariGuniState, type LariGuniPlayer } from '@/types';
import { randomRange } from '@/lib/utils';

export class LariGuniEngine extends BaseRealmEngine {
  realm = 'lari-dalam-guni' as any; // Allow flexibility for now
  private state!: LariGuniState;

  // Physics Constants
  private readonly GRAVITY = -1500; // Gravity pulling down
  private readonly GROUND_Y = 0;
  private readonly JUMP_POWER_Y = 800; // Max vertical jump
  private readonly JUMP_POWER_X = 400; // Max horizontal speed
  private readonly FRICTION = 0.9; // Ground friction
  private readonly CHARGE_RATE = 150; // Charge per second
  private readonly MAX_CHARGE = 100;

  protected onInitialize(config: GameConfig): void {
    const players: LariGuniPlayer[] = [
      {
        id: config.players[0].id,
        name: config.players[0].username,
        color: 'blue',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        state: 'idle',
        charge: 0,
        isAI: false
      },
      // Add AI opponent
      {
        id: 'ai_1',
        name: 'Kampung Bot',
        color: 'red',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        state: 'idle',
        charge: 0,
        isAI: true
      }
    ];

    this.state = {
      players,
      finishLineX: 2000, // 2000 units race
      isRaceActive: false,
      timeLeft: 60,
      winnerId: null,
      cameraX: 0
    };
  }

  // Input Handling
  startCharge(playerId: string) {
    if (!this.state.isRaceActive) return;
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || p.state !== 'idle') return;
    
    p.state = 'charging';
    p.charge = 0;
  }

  releaseCharge(playerId: string) {
    if (!this.state.isRaceActive) return;
    const p = this.state.players.find(pl => pl.id === playerId);
    if (!p || p.state !== 'charging') return;

    // Execute Jump
    const power = p.charge / 100;
    // Non-linear power curve (easy to jump small, hard to max)
    const effectivePower = Math.pow(power, 1.2); 

    p.vy = this.JUMP_POWER_Y * effectivePower;
    p.vx = this.JUMP_POWER_X * effectivePower;
    p.state = 'jumping';
    p.charge = 0;
  }

  // Game Loop
  protected onUpdate(deltaTime: number): void {
    if (!this.state.isRaceActive && !this.state.winnerId) {
        // Start race logic? Or manual start?
        // Auto-start for now
        this.state.isRaceActive = true; 
    }
    
    if (!this.state.isRaceActive) return;

    const dt = deltaTime / 1000;

    // Update Players
    this.state.players.forEach(p => {
        if (p.state === 'finished') return;

        // Charging Logic
        if (p.state === 'charging') {
            p.charge += this.CHARGE_RATE * dt;
            if (p.charge > this.MAX_CHARGE) {
                p.charge = this.MAX_CHARGE;
                // Auto-release if maxed out (penalty? or just jump?)
                // Let's make them stumble if they hold too long? 
                // For now, just clamp.
            }
        }

        // AI Logic
        if (p.isAI && p.state === 'idle') {
           // Randomly start charging
           if (Math.random() < 0.05) {
               p.state = 'charging';
               p.charge = 0;
           }
        }
        if (p.isAI && p.state === 'charging') {
            // Randomly release
            if (p.charge > randomRange(30, 90)) {
                // Release logic duplicated
                const power = p.charge / 100;
                p.vy = this.JUMP_POWER_Y * power;
                p.vx = this.JUMP_POWER_X * power;
                p.state = 'jumping';
                p.charge = 0;
            }
        }

        // Physics
        if (p.state === 'jumping' || p.state === 'falling') {
            p.vy += this.GRAVITY * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Ground Hit
            if (p.y <= this.GROUND_Y) {
                p.y = this.GROUND_Y;
                p.vy = 0;
                p.state = 'idle';
                // Apply friction to stop slide
                p.vx = 0; // Immediate stop for sack race feel? Or slide?
                // Sack race usually stop on landing.
            }
        }
        
        // Check Finish
        if (p.x >= this.state.finishLineX) {
            this.handleFinish(p);
        }
    });

    // Update Camera (follow leader)
    const leaderX = Math.max(...this.state.players.map(p => p.x));
    // Smooth camera lerp
    this.state.cameraX += (leaderX - this.state.cameraX) * 5 * dt;
  }

  handleFinish(p: LariGuniPlayer) {
      if (this.state.winnerId) return; // Second place
      this.state.winnerId = p.id;
      this.state.isRaceActive = false;
      p.state = 'finished';
      this._isGameOver = true;
  }

  // Getters
  getState() {
      // Clone needed?
      return JSON.parse(JSON.stringify(this.state)); 
  }

  protected checkGameOver(): boolean {
      return this._isGameOver;
  }

  protected onReset(): void {
      this.state.isRaceActive = false;
      this.state.winnerId = null;
      this.state.players.forEach(p => {
          p.x = 0;
          p.y = 0;
          p.vx = 0;
          p.vy = 0;
          p.state = 'idle';
          p.charge = 0;
      });
      // Restart
      setTimeout(() => { this.state.isRaceActive = true; }, 1000);
  }

  calculateScore(): Record<string, number> {
      // 100 points for win, 0 for lose
      const scores: Record<string, number> = {};
      this.state.players.forEach(p => {
          scores[p.id] = this.state.winnerId === p.id ? 100 : 0;
      });
      return scores;
  }
}
