import { BaseRealmEngine, type GameConfig } from '../../types';
import { type TujuGuliState, type Marble } from '@/types';

export class TujuGuliEngine extends BaseRealmEngine {
  realm = 'wau-bulan' as any; // Using wau-bulan ID for compatibility
  private state!: TujuGuliState;

  private readonly ARENA_RADIUS = 300;
  private readonly MARBLE_RADIUS = 10;
  private readonly STRIKER_RADIUS = 15;
  private readonly DRAG = 0.96;
  private readonly MIN_SPEED = 2;
  private readonly STRIKER_MASS = 2;
  private readonly TARGET_MASS = 1;

  protected onInitialize(config: GameConfig): void {
      const p1 = config.players[0];
      
      // Init targets
      const marbles: Marble[] = [];
      // Arrange in circle or triangle?
      // Scatter random near center
      for (let i = 0; i < 10; i++) {
          marbles.push({
              id: `m-${i}`,
              x: (Math.random() - 0.5) * 100,
              y: (Math.random() - 0.5) * 100,
              radius: this.MARBLE_RADIUS,
              vx: 0,
              vy: 0,
              color: this.getRandomColor(),
              isDead: false,
              ownerId: undefined
          });
      }

      // Striker (Place at edge, bottom)
      const striker: Marble = {
          id: p1.id,
          x: 0,
          y: this.ARENA_RADIUS - 40,
          radius: this.STRIKER_RADIUS,
          vx: 0,
          vy: 0,
          color: '#ffffff', // White striker
          isDead: false,
          ownerId: p1.id
      };

      this.state = {
          marbles,
          strikers: [striker],
          currentTurn: p1.id,
          phase: 'aiming',
          scores: { [p1.id]: 0 },
          winnerId: null,
          arenaRadius: this.ARENA_RADIUS
      };
      
      // Resolve initial overlaps
      this.resolveOverlaps();
  }

  getRandomColor() {
      const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
      return colors[Math.floor(Math.random() * colors.length)];
  }

  applyForce(id: string, forceX: number, forceY: number) {
      if (this.state.phase !== 'aiming') return;
      
      const striker = this.state.strikers.find(s => s.id === id);
      if (!striker) return;

      striker.vx = forceX;
      striker.vy = forceY;
      this.state.phase = 'moving';
  }

  protected onUpdate(dtMs: number): void {
      if (this.state.winnerId) return;

      const dt = dtMs / 1000;
      let moving = false;
      const allMarbles = [...this.state.marbles, ...this.state.strikers];

      // Physics Loop
      // Sub-steps for stability? 1 step for now.
      
      allMarbles.forEach(m => {
          if (m.isDead) return;

          m.x += m.vx * dt;
          m.y += m.vy * dt;

          // Friction
          m.vx *= this.DRAG;
          m.vy *= this.DRAG;

          if (Math.abs(m.vx) > this.MIN_SPEED || Math.abs(m.vy) > this.MIN_SPEED) {
              moving = true;
          } else {
              m.vx = 0;
              m.vy = 0;
          }

          // Check Bounds (Circle)
          const dist = Math.sqrt(m.x*m.x + m.y*m.y);
          if (dist > this.ARENA_RADIUS + m.radius) {
              // Exited arena
              if (m.ownerId) {
                  // Striker out -> Reset or Turn End?
                  // For now, Striker stops at edge? No, rules say "Terkeluar".
                  // Reset striker to start position for next shot
                  m.isDead = true; // Temporary flag to handle removal/reset
              } else {
                  // Target out -> Score!
                  m.isDead = true;
                  // Who scored? Current turn player
                  if (this.state.scores[this.state.currentTurn] !== undefined) {
                      this.state.scores[this.state.currentTurn]++;
                  }
              }
          }
      });

      // Collisions
        for (let i = 0; i < allMarbles.length; i++) {
            for (let j = i + 1; j < allMarbles.length; j++) {
                const a = allMarbles[i];
                const b = allMarbles[j];
                if (a.isDead || b.isDead) continue;
                this.resolveCollision(a, b);
            }
        }

      // Handle Logic
      if (this.state.phase === 'moving' && !moving) {
          // Reset Strikers if needed
          this.state.strikers.forEach(s => {
             if (s.isDead) { // Went out
                 s.isDead = false;
                 // Reset position
                 s.x = 0;
                 s.y = this.ARENA_RADIUS - 40;
                 s.vx = 0; 
                 s.vy = 0;
             }
             // Or if it stayed in, keep it there?
             // Usually Tuju Guli, you shoot from where you lie?
             // Let's keep it simple: Striker stays where it is unless out.
          });

          // Check Game Over
          if (this.state.marbles.every(m => m.isDead)) {
              this.state.winnerId = this.state.strikers[0].id; // Only 1 player logic for now
              this._isGameOver = true;
          } else {
              this.state.phase = 'aiming';
              // If multiplayer, switch turn here
          }
      }
  }

  resolveCollision(a: Marble, b: Marble) {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
          // Overlap separation
          const overlap = minDist - dist;
          const normalX = dx / dist;
          const normalY = dy / dist;
          
          const massA = a.ownerId ? this.STRIKER_MASS : this.TARGET_MASS;
          const massB = b.ownerId ? this.STRIKER_MASS : this.TARGET_MASS;
          const totalMass = massA + massB;
          
          a.x -= normalX * overlap * (massB / totalMass);
          a.y -= normalY * overlap * (massB / totalMass);
          b.x += normalX * overlap * (massA / totalMass);
          b.y += normalY * overlap * (massA / totalMass);

          // Elastic Bounce
          // Relative velocity
          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const velAlongNormal = rvx * normalX + rvy * normalY;

          if (velAlongNormal > 0) return; // Moving away

          const restitution = 0.8; // Bounciness
          const j = -(1 + restitution) * velAlongNormal;
          const impulse = j / (1/massA + 1/massB);

          a.vx -= impulse * normalX / massA;
          a.vy -= impulse * normalY / massA;
          b.vx += impulse * normalX / massB;
          b.vy += impulse * normalY / massB;
      }
  }

  resolveOverlaps() {
      // Simple relaxation loop
      for(let iter=0; iter<10; iter++) {
          let overlap = false;
          const all = [...this.state.marbles, ...this.state.strikers];
          for(let i=0; i<all.length; i++) {
              for(let j=i+1; j<all.length; j++) {
                  const dx = all[j].x - all[i].x;
                  const dy = all[j].y - all[i].y;
                  const d = Math.sqrt(dx*dx + dy*dy);
                  if (d < all[i].radius + all[j].radius) {
                      this.resolveCollision(all[i], all[j]); // Reuse collision logic to separate
                      overlap = true;
                  }
              }
          }
          if (!overlap) break;
      }
  }

  getState() { return JSON.parse(JSON.stringify(this.state)) as TujuGuliState; }
  protected checkGameOver(): boolean { return this._isGameOver; }
  calculateScore(): Record<string, number> { return this.state.scores; }
  protected onReset(): void { this.onInitialize({ mode: 'solo', players: [{ id: this.state.strikers[0].id, username: 'Player', score:0, isAI:false, isActive:true }]}); }
}
