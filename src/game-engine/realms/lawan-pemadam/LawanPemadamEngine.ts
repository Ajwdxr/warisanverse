import { BaseRealmEngine, type GameConfig } from '../../types';
import { type LawanPemadamState, type Eraser } from '@/types';
import { randomRange } from '@/lib/utils';

export class LawanPemadamEngine extends BaseRealmEngine {
  realm = 'lawan-pemadam' as any;
  private state!: LawanPemadamState;

  private readonly DRAG = 0.96; 
  private readonly ANGULAR_DRAG = 0.92;
  private readonly TABLE_WIDTH = 800;
  private readonly TABLE_HEIGHT = 600;
  private readonly MIN_SPEED = 2;
  
  // Z Physics
  private readonly GRAVITY_Z = 2500; 
  private readonly BOUNCE_Z = 0.4;
  private readonly FLIP_SPEED_FACTOR = 6; 

  protected onInitialize(config: GameConfig & { playerFlag?: string, bestOf?: number }): void {
    const p1 = config.players[0];
    const playerFlag = config.playerFlag || 'malaysia';
    const bestOf = config.bestOf || 1; // Default 1 round (Best of 1)
    const targetWins = Math.ceil(bestOf / 2);

    // Determines opponent flag
    const flags = ['malaysia', 'uk', 'indonesia', 'japan', 'palestine', 'usa', 'brazil'];
    const otherFlags = flags.filter(f => f !== playerFlag);
    const opponentFlag = otherFlags[Math.floor(Math.random() * otherFlags.length)];

    // Initial Match State
    this.state = {
      erasers: [], // Set below
      currentTurn: p1.id,
      winnerId: null,
      phase: 'aiming',
      bounds: { width: this.TABLE_WIDTH, height: this.TABLE_HEIGHT },
      match: {
          playerWins: 0,
          aiWins: 0,
          targetWins,
          currentRound: 1
      }
    };
    
    // Setup Round
    this.setupRound(p1.id, playerFlag, opponentFlag);
  }

  setupRound(playerId: string, pFlag: string, oFlag: string) {
    const p2: Eraser = {
      id: 'ai',
      x: this.TABLE_WIDTH - 150,
      y: this.TABLE_HEIGHT / 2,
      width: 80,
      height: 120,
      rotation: 180,
      rotationX: 0,
      vx: 0,
      vy: 0,
      vr: 0,
      z: 0,
      vz: 0,
      flag: oFlag, 
      isDead: false
    };

    const playerEraser: Eraser = {
      id: playerId, 
      x: 150,
      y: this.TABLE_HEIGHT / 2,
      width: 80,
      height: 120,
      rotation: 0,
      rotationX: 0,
      vx: 0,
      vy: 0,
      vr: 0,
      z: 0,
      vz: 0,
      flag: pFlag,
      isDead: false
    };

    this.state.erasers = [playerEraser, p2];
    this.state.phase = 'aiming';
    // Winner of previous round starts? Or alternate? Check match state later.
    // For now, default P1 starts.
  }

  // Called when next round requested
  startNextRound() {
      if (this.state.winnerId) return; // Match over already

      const p1 = this.state.erasers.find(e => e.id !== 'ai');
      const p2 = this.state.erasers.find(e => e.id === 'ai');
      if (!p1 || !p2) return;

      this.state.match.currentRound++;
      this.setupRound(p1.id, p1.flag, p2.flag);
      
      // Alternate start? Or loser starts? usually loser starts.
      // But let's randomize or alternate.
      // Or keep existing turn logic.
  }

  // Input
  applyForce(id: string, forceX: number, forceY: number) {
      if (this.state.phase !== 'aiming') return;
      if (this.state.currentTurn !== id) return;

      const eraser = this.state.erasers.find(e => e.id === id);
      if (!eraser) return;

      eraser.vx = forceX;
      eraser.vy = forceY;
      
      const speed = Math.sqrt(forceX*forceX + forceY*forceY);
      eraser.vr = (Math.random() - 0.5) * (speed * 0.5);

      if (speed > 200) {
          eraser.vz = speed * 0.8; 
      }

      this.state.phase = 'moving';
  }

  protected onUpdate(deltaTime: number): void {
      if (this.state.winnerId && this._isGameOver) return;
      if (this.state.phase === 'round_over') return;

      const dt = deltaTime / 1000;
      let moving = false;

      this.state.erasers.forEach(e => {
          if (e.isDead) return;

          e.x += e.vx * dt;
          e.y += e.vy * dt;
          e.rotation += e.vr * dt;
          
          if (e.z > 0 || e.vz !== 0) {
              e.vz -= this.GRAVITY_Z * dt;
              e.z += e.vz * dt;
              
              const speed = Math.sqrt(e.vx*e.vx + e.vy*e.vy);
              e.rotationX += speed * this.FLIP_SPEED_FACTOR * dt;

              if (e.z <= 0) {
                  e.z = 0;
                  if (Math.abs(e.vz) > 100) {
                      e.vz = -e.vz * this.BOUNCE_Z;
                  } else {
                      e.vz = 0;
                      e.rotationX = Math.round(e.rotationX / 180) * 180;
                  }
              }
          } else {
              e.z = 0;
              e.vz = 0;
              e.vx *= this.DRAG;
              e.vy *= this.DRAG;
              e.vr *= this.ANGULAR_DRAG;
          }

          if (Math.abs(e.vx) < this.MIN_SPEED && Math.abs(e.vy) < this.MIN_SPEED && Math.abs(e.vr) < 1 && e.z === 0) {
              e.vx = 0;
              e.vy = 0;
              e.vr = 0;
          } else {
              moving = true;
          }

          // Bounds Check => Instant Round Loss
          if (e.x < -50 || e.x > this.TABLE_WIDTH+50 || e.y < -50 || e.y > this.TABLE_HEIGHT+50) {
              e.isDead = true;
              this.handleRoundEnd(e.id); // e.id LOST
          }
      });

      if (this.state.phase === 'moving' && !moving) {
          this.checkWinCondition();
          
          if (this.state.phase !== 'round_over' && !this.state.winnerId) {
              this.state.phase = 'aiming';
              this.state.currentTurn = this.state.currentTurn === 'ai' ? this.state.erasers[0].id : 'ai';
              
              if (this.state.currentTurn === 'ai') {
                  setTimeout(() => this.performAITurn(), 800);
              }
          }
      }
  }

  handleRoundEnd(loserId: string) {
      if (this.state.phase === 'round_over') return;

      const p1 = this.state.erasers[0]; // Player
      // Determine winner
      const winnerId = loserId === 'ai' ? p1.id : 'ai';
      
      this.incrementScore(winnerId);
  }

  checkWinCondition() {
      if (this.state.phase === 'round_over') return;

      const current = this.state.erasers.find(e => e.id === this.state.currentTurn);
      const opponent = this.state.erasers.find(e => e.id !== this.state.currentTurn);

      if (!current || !opponent || current.isDead || opponent.isDead) return;

      const polyCurrent = this.getPolygon(current);
      const polyOpponent = this.getPolygon(opponent);
      
      const centerCurrent = { x: current.x, y: current.y };
      const centerOpponent = { x: opponent.x, y: opponent.y };

      if (this.isPointInPolygon(centerCurrent, polyOpponent) || this.isPointInPolygon(centerOpponent, polyCurrent)) {
          // Current WIN
          this.incrementScore(current.id);
      }
  }

  incrementScore(winnerId: string) {
      if (winnerId === 'ai') this.state.match.aiWins++;
      else this.state.match.playerWins++;

      // Check Match End
      if (this.state.match.playerWins >= this.state.match.targetWins) {
          this.state.winnerId = this.state.erasers[0].id; // Player Wins Match
          this._isGameOver = true;
      } else if (this.state.match.aiWins >= this.state.match.targetWins) {
          this.state.winnerId = 'ai'; // AI Wins Match
          this._isGameOver = true;
      } else {
          // Round Over, but Match Continues
          this.state.phase = 'round_over';
          // Page will show "Next Round" button which calls engine.startNextRound()
      }
  }

  isPointInPolygon(p: {x:number, y:number}, poly: {x:number, y:number}[]): boolean {
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const xi = poly[i].x, yi = poly[i].y;
          const xj = poly[j].x, yj = poly[j].y;
          const intersect = ((yi > p.y) !== (yj > p.y)) && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
      }
      return inside;
  }

  getPolygon(e: Eraser): {x:number, y:number}[] {
      const cx = e.x;
      const cy = e.y;
      const hw = e.width / 2;
      const hh = e.height / 2;
      const angle = e.rotation * (Math.PI / 180);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const corners = [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }];
      return corners.map(p => ({ x: cx + (p.x * cos - p.y * sin), y: cy + (p.x * sin + p.y * cos) }));
  }

  performAITurn() {
      if (this.state.phase !== 'aiming' || this.state.currentTurn !== 'ai') return;
      const ai = this.state.erasers.find(e => e.id === 'ai');
      const target = this.state.erasers.find(e => e.id !== 'ai');
      if (!ai || !target) return;
      const dx = target.x - ai.x;
      const dy = target.y - ai.y;
      const errorX = randomRange(-50, 50);
      const errorY = randomRange(-50, 50);
      const forceMult = 3.5; 
      this.applyForce('ai', (dx + errorX) * forceMult, (dy + errorY) * forceMult);
  }

  getState() { return JSON.parse(JSON.stringify(this.state)) as LawanPemadamState; }
  protected checkGameOver(): boolean { return this._isGameOver; }
  calculateScore(): Record<string, number> { 
      const scores: Record<string, number> = {};
      const pid = this.state.erasers[0].id;
      scores[pid] = this.state.winnerId === pid ? 100 : 0;
      return scores;
  }
  protected onReset(): void { 
      // Full reset logic? usually page handles re-init.
      // But if engine reused:
      this.onInitialize({ mode: 'solo', players: [{ id: this.state.erasers[0].id, username: 'Player', score:0, isAI:false, isActive:true }]}); 
  }
}
