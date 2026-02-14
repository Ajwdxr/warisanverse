import { type WauBulanState, type WauKite, type WindState, type WauObstacle } from '@/types';
import { BaseRealmEngine, type GameConfig } from '../../types';
import { clamp, randomRange, distance } from '@/lib/utils';

export class WauBulanEngine extends BaseRealmEngine {
  realm = 'wau-bulan' as const;
  private state!: WauBulanState;
  private obstacleSpawnTimer: number = 0;
  private readonly OBSTACLE_SPAWN_INTERVAL = 3;
  private readonly GRAVITY = 0.3;
  private readonly LIFT_FORCE = 0.5;
  private readonly MAX_OBSTACLES = 8;

  protected onInitialize(): void {
    this.state = {
      kite: {
        x: 200,
        y: 400,
        angle: 0,
        tension: 50,
        stability: 100,
      },
      wind: {
        speed: 3,
        direction: 0,
        gustFactor: 0,
        turbulence: 0,
      },
      score: 0,
      altitude: 0,
      maxAltitude: 0,
      survivalTime: 0,
      obstacles: [],
    };
    this.obstacleSpawnTimer = 0;
  }

  getState(): WauBulanState {
    return {
      ...this.state,
      kite: { ...this.state.kite },
      wind: { ...this.state.wind },
      obstacles: this.state.obstacles.map((o) => ({ ...o })),
    };
  }

  // Player input: adjust kite angle and tension
  controlKite(angleInput: number, tensionInput: number): void {
    const kite = this.state.kite;
    kite.angle = clamp(kite.angle + angleInput * 2, -60, 60);
    kite.tension = clamp(kite.tension + tensionInput * 5, 10, 100);
  }

  protected onUpdate(deltaTime: number): void {
    const dt = deltaTime / 1000;
    const kite = this.state.kite;
    const wind = this.state.wind;

    this.state.survivalTime += dt;
    this.state.score = Math.floor(this.state.survivalTime * 10 + this.state.maxAltitude * 0.5);

    // Update wind
    this.updateWind(dt);

    // Calculate forces on kite
    const windForceX = wind.speed * Math.cos(wind.direction * Math.PI / 180) * (1 + wind.gustFactor);
    const windForceY = -wind.speed * Math.sin(wind.direction * Math.PI / 180) * (1 + wind.gustFactor);

    // Angle affects lift
    const angleRad = kite.angle * Math.PI / 180;
    const liftMultiplier = Math.cos(angleRad) * (kite.tension / 100);
    const lift = this.LIFT_FORCE * liftMultiplier * wind.speed;

    // Apply forces
    const dragX = windForceX * 0.3;
    const dragY = windForceY * 0.3 - this.GRAVITY + lift;

    kite.x += dragX * dt * 60;
    kite.y += dragY * dt * 60;

    // Turbulence effect
    if (wind.turbulence > 0) {
      kite.x += (Math.random() - 0.5) * wind.turbulence * 2;
      kite.y += (Math.random() - 0.5) * wind.turbulence;
      kite.stability = Math.max(0, kite.stability - wind.turbulence * dt * 10);
    } else {
      kite.stability = Math.min(100, kite.stability + dt * 5);
    }

    // Boundaries
    kite.x = clamp(kite.x, 20, 380);
    kite.y = clamp(kite.y, 20, 580);

    // Calculate altitude (inverse of y, higher = more altitude)
    this.state.altitude = Math.max(0, 600 - kite.y);
    this.state.maxAltitude = Math.max(this.state.maxAltitude, this.state.altitude);

    // Update obstacles
    this.updateObstacles(dt);

    // Collision check
    this.checkObstacleCollisions();
  }

  private updateWind(dt: number): void {
    const wind = this.state.wind;
    const time = this.state.survivalTime;

    // Wind gradually gets stronger
    wind.speed = 3 + time * 0.05;
    wind.direction += (Math.sin(time * 0.5) * 10 + Math.random() * 5 - 2.5) * dt;
    wind.direction = ((wind.direction % 360) + 360) % 360;

    // Random gusts
    if (Math.random() < 0.01) {
      wind.gustFactor = randomRange(0.3, 0.8);
    } else {
      wind.gustFactor *= 0.95; // Decay
    }

    // Random turbulence
    if (Math.random() < 0.005 + time * 0.001) {
      wind.turbulence = randomRange(1, 3);
    } else {
      wind.turbulence *= 0.98;
    }
  }

  private updateObstacles(dt: number): void {
    this.obstacleSpawnTimer += dt;

    // Spawn obstacles
    if (this.obstacleSpawnTimer >= this.OBSTACLE_SPAWN_INTERVAL && this.state.obstacles.length < this.MAX_OBSTACLES) {
      this.spawnObstacle();
      this.obstacleSpawnTimer = 0;
    }

    // Move obstacles
    for (const obs of this.state.obstacles) {
      switch (obs.type) {
        case 'storm':
          obs.x += Math.sin(this.state.survivalTime) * obs.speed * dt * 30;
          obs.y += obs.speed * dt * 20;
          break;
        case 'bird':
          obs.x += obs.speed * dt * 60;
          obs.y += Math.sin(this.state.survivalTime * 3) * 20 * dt;
          break;
        case 'thermal':
          obs.y -= obs.speed * dt * 40; // Thermals rise
          break;
        case 'rain':
          obs.y += obs.speed * dt * 80;
          break;
      }
    }

    // Remove off-screen obstacles
    this.state.obstacles = this.state.obstacles.filter(
      (obs) => obs.x > -50 && obs.x < 450 && obs.y > -50 && obs.y < 650
    );
  }

  private spawnObstacle(): void {
    const types: WauObstacle['type'][] = ['storm', 'bird', 'thermal', 'rain'];
    const type = types[Math.floor(Math.random() * types.length)];

    const obstacle: WauObstacle = {
      id: Date.now() + Math.random(),
      type,
      x: type === 'bird' ? -30 : randomRange(50, 350),
      y: type === 'rain' ? -30 : type === 'thermal' ? 600 : randomRange(50, 300),
      radius: type === 'storm' ? 40 : type === 'thermal' ? 50 : 15,
      speed: randomRange(1, 3),
    };

    this.state.obstacles.push(obstacle);
  }

  private checkObstacleCollisions(): void {
    const kite = this.state.kite;

    for (const obs of this.state.obstacles) {
      const dist = distance(kite.x, kite.y, obs.x, obs.y);
      if (dist < obs.radius + 15) {
        switch (obs.type) {
          case 'storm':
            kite.stability -= 30;
            this.state.wind.turbulence = 3;
            break;
          case 'bird':
            kite.stability -= 20;
            kite.y += 30;
            break;
          case 'thermal':
            // Thermals are beneficial!
            kite.y -= 50;
            this.state.score += 50;
            break;
          case 'rain':
            kite.stability -= 5;
            kite.tension = Math.max(10, kite.tension - 10);
            break;
        }
        // Remove obstacle after collision
        this.state.obstacles = this.state.obstacles.filter((o) => o.id !== obs.id);
      }
    }
  }

  protected checkGameOver(): boolean {
    // Game over if kite crashes (too low) or loses all stability
    return this.state.kite.y >= 570 || this.state.kite.stability <= 0;
  }

  calculateScore(): Record<string, number> {
    const players = this.config.players;
    const scores: Record<string, number> = {};
    players.forEach((p) => {
      scores[p.id] = this.state.score;
    });
    return scores;
  }

  getSurvivalTime(): number {
    return Math.floor(this.state.survivalTime);
  }

  protected onReset(): void {
    this.state = {
      kite: { x: 200, y: 400, angle: 0, tension: 50, stability: 100 },
      wind: { speed: 3, direction: 0, gustFactor: 0, turbulence: 0 },
      score: 0,
      altitude: 0,
      maxAltitude: 0,
      survivalTime: 0,
      obstacles: [],
    };
    this.obstacleSpawnTimer = 0;
  }
}
