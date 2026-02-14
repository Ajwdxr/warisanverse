'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { TujuGuliEngine } from '@/game-engine/realms/tuju-guli/TujuGuliEngine';
import { createClient } from '@/lib/supabase/client';
import { submitGameResult } from '@/lib/game-actions';
import { type TujuGuliState, type Marble } from '@/types';

export default function TujuGuliPage() {
  const [phase, setPhase] = useState<'menu' | 'playing' | 'ended'>('menu');
  const engineRef = useRef<TujuGuliEngine | null>(null);
  const [gameState, setGameState] = useState<TujuGuliState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [rewards, setRewards] = useState<{ xp: number; gold: number } | null>(null);

  // Drag State
  const [dragStart, setDragStart] = useState<{x:number, y:number} | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{x:number, y:number} | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const uid = user?.id || null;
      setUserId(uid);
      userIdRef.current = uid;
    };
    checkUser();
  }, []);

  const startGame = useCallback(() => {
    const engine = new TujuGuliEngine();
    engine.initialize({
      mode: 'solo',
      players: [{ id: 'player', username: 'Player', score: 0, isAI: false, isActive: true }],
    });
    engineRef.current = engine;
    setGameState(engine.getState());
    setPhase('playing');
    setRewards(null);
    lastTimeRef.current = performance.now();
    requestAnimationFrame(gameLoop);
  }, []);

  const gameLoop = (time: number) => {
    const engine = engineRef.current;
    if (!engine || phase === 'ended') return;

    if (engine.isGameOver()) {
        setPhase('ended');
        handleSubmitResult(engine);
        return;
    }

    const dt = time - lastTimeRef.current;
    lastTimeRef.current = time;

    engine.update(dt);
    setGameState(engine.getState());

    animFrameRef.current = requestAnimationFrame(gameLoop);
  };

  const handleSubmitResult = async (engine: TujuGuliEngine) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const state = engine.getState();
      const score = state.scores['player'] || 0;
      
      const result = {
          winnerId: uid,
          scores: { [uid]: score, ai: 0 },
          duration: 0, 
          isDraw: false,
          xpEarned: 0,
          goldEarned: 0
      };
      
      const res = await submitGameResult('wau-bulan', 'solo', result, uid);
      if (res.success && res.xp !== undefined) {
         setRewards({ xp: res.xp, gold: res.gold || 0 });
      }
  };

  // Input Handling
  const handlePointerDown = (e: React.PointerEvent) => {
      if (!gameState || gameState.phase !== 'aiming') return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left - gameState.arenaRadius; // Center relative
      const clickY = e.clientY - rect.top - gameState.arenaRadius;

      // Find if clicked on striker
      const striker = gameState.strikers.find(s => s.id === 'player');
      if (!striker) return;

      const dist = Math.sqrt(Math.pow(clickX - striker.x, 2) + Math.pow(clickY - striker.y, 2));
      
      if (dist < striker.radius * 2) { // Generous hitbox
          setDragStart({ x: striker.x, y: striker.y });
          setDragCurrent({ x: clickX, y: clickY });
      }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!dragStart) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Center relative coordinates
      const x = e.clientX - rect.left - (gameState?.arenaRadius || 0);
      const y = e.clientY - rect.top - (gameState?.arenaRadius || 0);
      setDragCurrent({ x, y });
  };

  const handlePointerUp = () => {
      if (!dragStart || !dragCurrent) return;
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      
      const forceMult = 5; // Power multiplier
      engineRef.current?.applyForce('player', dx * forceMult, dy * forceMult);

      setDragStart(null);
      setDragCurrent(null);
  };

  // Rendering
  const RADIUS = gameState?.arenaRadius || 300;

  if (phase === 'menu') {
      return (
          <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
              <div className="game-card max-w-md w-full text-center p-8 bg-white rounded-xl shadow-2xl">
                  <h1 className="text-4xl font-bold mb-2 text-green-700 border-b-4 border-green-600 pb-2 inline-block">TUJU GULI</h1>
                  <p className="text-gray-600 mb-8 mt-4 font-serif">"The Marble Master"</p>
                  
                  <div className="space-y-4 mb-8 text-left bg-gray-100 p-4 rounded-lg text-sm border-l-4 border-yellow-500">
                      <p>🎱 <strong>How to Play:</strong></p>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          <li>Drag and shoot your white striker marble.</li>
                          <li>Hit colored marbles OUT of the circle.</li>
                          <li>Collect as many as you can!</li>
                      </ul>
                  </div>

                  <button onClick={startGame} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-xl shadow-lg transition transform active:scale-95">
                      START GAME
                  </button>
                  <Link href="/realms" className="block mt-4 text-gray-500 hover:text-gray-800">Exit</Link>
              </div>
          </div>
      );
  }

  // Arrow Render
  let arrow = null;
  if (dragStart && dragCurrent) {
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const power = Math.min(len / 200, 1);
      const color = power > 0.8 ? 'red' : 'green';

      // Arrow position relative to center (0,0 is center of arena div)
      arrow = (
          <div 
             className={`absolute h-0 border-t-4 border-dashed border-${color}-500 origin-left z-20 pointer-events-none`}
             style={{
                 left: dragStart.x + RADIUS,
                 top: dragStart.y + RADIUS,
                 width: Math.min(len, 200),
                 transform: `rotate(${angle}deg)`
             }}
          >
              <div className={`absolute right-0 -top-2 w-4 h-4 bg-${color}-500 rounded-full`} />
          </div>
      );
  }

  return (
      <div className="min-h-screen bg-stone-900 overflow-hidden flex items-center justify-center p-4 select-none">
          {/* Floor Texture */}
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("/patterns/sand.png")', backgroundSize: '200px' }} />

          {/* Game Arena */}
          <div 
             ref={containerRef}
             className="relative rounded-full shadow-2xl overflow-hidden bg-[#dcc095] border-8 border-stone-600"
             style={{ 
                 width: RADIUS * 2, 
                 height: RADIUS * 2,
                 boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3)'
             }}
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onPointerLeave={handlePointerUp}
          >
              <div className="absolute inset-0 pointer-events-none opacity-30" style={{ backgroundImage: 'url("/patterns/dirt.png")' }} />
              
              {/* Center Hole */}
              <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-black/40 rounded-full blur-[2px] transform -translate-x-1/2 -translate-y-1/2" />
              
              {/* Marbles */}
              {gameState?.marbles.map(m => (
                  <div 
                    key={m.id}
                    className="absolute rounded-full shadow-md"
                    style={{
                        left: m.x + RADIUS - m.radius,
                        top: m.y + RADIUS - m.radius,
                        width: m.radius * 2,
                        height: m.radius * 2,
                        backgroundColor: m.color,
                        background: `radial-gradient(circle at 30% 30%, white, ${m.color}, black)`,
                        boxShadow: '2px 2px 5px rgba(0,0,0,0.4)'
                    }}
                  />
              ))}

              {/* Strikers */}
              {gameState?.strikers.map(s => (
                  <div 
                    key={s.id}
                    className="absolute rounded-full shadow-lg z-10"
                    style={{
                        left: s.x + RADIUS - s.radius,
                        top: s.y + RADIUS - s.radius,
                        width: s.radius * 2,
                        height: s.radius * 2,
                        backgroundColor: 'white',
                        background: `radial-gradient(circle at 30% 30%, #fff, #ddd, #999)`,
                        boxShadow: '0 0 10px rgba(255,255,255,0.5), 2px 2px 5px rgba(0,0,0,0.5)',
                        border: '2px solid white'
                    }}
                  />
              ))}

              {arrow}

              {/* HUD */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-sm font-bold">
                  Score: {gameState?.scores['player']}
              </div>
          </div>

          {/* End Screen */}
          {phase === 'ended' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
                   <div className="game-card bg-white p-8 rounded-xl text-center shadow-2xl animate-bounce-in max-w-sm">
                       <h2 className="text-3xl font-bold mb-4 text-green-700">GAME OVER</h2>
                       <p className="mb-6 text-xl">
                           You collected <strong>{gameState?.scores['player']}</strong> marbles!
                       </p>
                       {rewards && (
                           <div className="bg-emerald-100 p-4 rounded-xl mb-4 shadow-inner border border-emerald-200">
                               <p className="text-emerald-900 font-bold text-sm mb-1 uppercase tracking-wider">Rewards Earned</p>
                               <div className="flex justify-center gap-6 mt-2">
                                   <span className="text-indigo-950 font-black text-xl">+{rewards.xp} XP</span>
                                   <span className="text-amber-900 font-black text-xl">+{rewards.gold} Gold</span>
                               </div>
                           </div>
                       )}
                       <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 w-full mb-2">Play Again</button>
                       <Link href="/realms" className="block text-gray-500 hover:text-gray-800">Exit</Link>
                   </div>
              </div>
          )}
      </div>
  );
}
