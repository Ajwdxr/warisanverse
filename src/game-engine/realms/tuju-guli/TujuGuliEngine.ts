import { BaseRealmEngine, type GameConfig } from '../../types';
import { type TujuGuliState, type Marble } from '@/types';

export class TujuGuliEngine extends BaseRealmEngine {
  realm = 'wau-bulan' as const; // Using wau-bulan ID for compatibility
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
      for (let i = 0; i < 12; i++) {
          marbles.push({
              id: `m-${i}`,
              x: (Math.random() - 0.5) * 150,
              y: (Math.random() - 0.5) * 150,
              radius: this.MARBLE_RADIUS,
              vx: 0,
              vy: 0,
              color: this.getRandomColor(),
              isDead: false,
              ownerId: undefined
          });
      }

      // Player Striker
      const playerStriker: Marble = {
          id: p1.id,
          x: -50,
          y: this.ARENA_RADIUS - 40,
          radius: this.STRIKER_RADIUS,
          vx: 0,
          vy: 0,
          color: '#ffffff',
          isDead: false,
          ownerId: p1.id
      };

      // AI Striker
      const aiStriker: Marble = {
          id: 'ai',
          x: 50,
          y: this.ARENA_RADIUS - 40,
          radius: this.STRIKER_RADIUS,
          vx: 0,
          vy: 0,
          color: '#ffdd00', // Yellow striker for AI
          isDead: false,
          ownerId: 'ai'
      };

      this.state = {
          marbles,
          strikers: [playerStriker, aiStriker],
          currentTurn: p1.id,
          phase: 'aiming',
          scores: { [p1.id]: 0, 'ai': 0 },
          winnerId: null,
          arenaRadius: this.ARENA_RADIUS
      };
      
      this.resolveOverlaps();
  }

  getRandomColor() {
      const colors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6'];
      return colors[Math.floor(Math.random() * colors.length)];
  }

  applyForce(id: string, forceX: number, forceY: number) {
      if (this.state.phase !== 'aiming' || this.state.currentTurn !== id) return;
      
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
      
      // Filter out dead marbles for processing
      const activeMarbles = this.state.marbles.filter(m => !m.isDead);
      const allActive = [...activeMarbles, ...this.state.strikers];

      // AI Thought Logic
      if (this.state.phase === 'aiming' && this.state.currentTurn === 'ai') {
          this.handleAITurn();
          return;
      }

      // Physics Loop
      allActive.forEach(m => {
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

          // Check Bounds
          const dist = Math.sqrt(m.x*m.x + m.y*m.y);
          if (dist > this.ARENA_RADIUS) {
              if (m.ownerId) {
                  // Striker reset handled at end of move
              } else {
                  // Target out
                  m.isDead = true;
                  if (this.state.scores[this.state.currentTurn] !== undefined) {
                      this.state.scores[this.state.currentTurn]++;
                  }
              }
          }
      });

      // Collisions
        for (let i = 0; i < allActive.length; i++) {
            for (let j = i + 1; j < allActive.length; j++) {
                this.resolveCollision(allActive[i], allActive[j]);
            }
        }

      // Turn Ending
      if (this.state.phase === 'moving' && !moving) {
          this.state.phase = 'aiming';
          
          // Reset strikers that went out
          this.state.strikers.forEach(s => {
              const dist = Math.sqrt(s.x*s.x + s.y*s.y);
              if (dist > this.ARENA_RADIUS - s.radius) {
                  s.x = s.id === 'ai' ? 50 : -50;
                  s.y = this.ARENA_RADIUS - 40;
                  s.vx = 0;
                  s.vy = 0;
              }
          });

          // Check Win Condition
          if (this.state.marbles.every(m => m.isDead)) {
              this.determineWinner();
          } else {
              // Switch Turn
              const playerIds = this.state.strikers.map(s => s.id);
              const currentIndex = playerIds.indexOf(this.state.currentTurn);
              this.state.currentTurn = playerIds[(currentIndex + 1) % playerIds.length];
          }
      }
  }

  private handleAITurn() {
      // Small Delay before shooting
      const target = this.state.marbles.find(m => !m.isDead);
      if (!target) return;
      
      // Find nearest marble
      const aiStriker = this.state.strikers.find(s => s.id === 'ai')!;
      let nearestDist = Infinity;
      let nearestMarble = target;
      
      this.state.marbles.forEach(m => {
          if (m.isDead) return;
          const d = Math.sqrt(Math.pow(m.x - aiStriker.x, 2) + Math.pow(m.y - aiStriker.y, 2));
          if (d < nearestDist) {
              nearestDist = d;
              nearestMarble = m;
          }
      });

      // Calculate vector to target
      const dx = nearestMarble.x - aiStriker.x;
      const dy = nearestMarble.y - aiStriker.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      // Add some randomness/error
      const errorX = (Math.random() - 0.5) * 15;
      const errorY = (Math.random() - 0.5) * 15;
      
      const force = 400 + Math.random() * 200;
      
      setTimeout(() => {
          this.applyForce('ai', (dx/dist) * force + errorX, (dy/dist) * force + errorY);
      }, 1000);
  }

  private determineWinner() {
      const pId = this.state.strikers.find(s => s.id !== 'ai')?.id || 'player';
      const pScore = this.state.scores[pId] || 0;
      const aiScore = this.state.scores['ai'] || 0;

      if (pScore > aiScore) this.state.winnerId = pId;
      else if (aiScore > pScore) this.state.winnerId = 'ai';
      else this.state.winnerId = 'draw';
      
      this._isGameOver = true;
  }

  resolveCollision(a: Marble, b: Marble) {
      if (a.isDead || b.isDead) return;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
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

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const velAlongNormal = rvx * normalX + rvy * normalY;

          if (velAlongNormal > 0) return;

          const restitution = 0.8;
          const j = -(1 + restitution) * velAlongNormal;
          const impulse = j / (1/massA + 1/massB);

          a.vx -= impulse * normalX / massA;
          a.vy -= impulse * normalY / massA;
          b.vx += impulse * normalX / massB;
          b.vy += impulse * normalY / massB;
      }
  }

  resolveOverlaps() {
      for(let iter=0; iter<10; iter++) {
          let overlap = false;
          const all = [...this.state.marbles, ...this.state.strikers];
          for(let i=0; i<all.length; i++) {
              if (all[i].isDead) continue;
              for(let j=i+1; j<all.length; j++) {
                  if (all[j].isDead) continue;
                  const dx = all[j].x - all[i].x;
                  const dy = all[j].y - all[i].y;
                  const d = Math.sqrt(dx*dx + dy*dy);
                  if (d < all[i].radius + all[j].radius) {
                      this.resolveCollision(all[i], all[j]);
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
  protected onReset(): void { this.onInitialize({ mode: 'solo', players: [{ id: this.state.strikers.find(s=>s.id!=='ai')?.id || 'player', username: 'Player', score:0, isAI:false, isActive:true }]}); }
}
