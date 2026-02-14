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
      const playerScore = state.scores[uid] || state.scores['player'] || 0;
      const aiScore = state.scores['ai'] || 0;
      
      const result = {
          winnerId: state.winnerId === 'ai' ? 'ai' : (state.winnerId === 'draw' ? null : uid),
          scores: { [uid]: playerScore, ai: aiScore },
          duration: 0, 
          isDraw: state.winnerId === 'draw',
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
      if (!gameState || gameState.phase !== 'aiming' || gameState.currentTurn === 'ai') return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left - gameState.arenaRadius;
      const clickY = e.clientY - rect.top - gameState.arenaRadius;

      const striker = gameState.strikers.find(s => s.id !== 'ai');
      if (!striker) return;

      const dist = Math.sqrt(Math.pow(clickX - striker.x, 2) + Math.pow(clickY - striker.y, 2));
      
      if (dist < striker.radius * 3) { 
          setDragStart({ x: striker.x, y: striker.y });
          setDragCurrent({ x: clickX, y: clickY });
      }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!dragStart) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left - (gameState?.arenaRadius || 0);
      const y = e.clientY - rect.top - (gameState?.arenaRadius || 0);
      setDragCurrent({ x, y });
  };

  const handlePointerUp = () => {
      if (!dragStart || !dragCurrent) return;
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      
      const forceMult = 5; 
      engineRef.current?.applyForce(gameState?.currentTurn || 'player', dx * forceMult, dy * forceMult);

      setDragStart(null);
      setDragCurrent(null);
  };

  // Rendering
  const RADIUS = gameState?.arenaRadius || 300;

  if (phase === 'menu') {
      return (
          <div className="min-h-screen batik-bg flex items-center justify-center p-4">
              <div className="game-card max-w-md w-full text-center p-8 glass-strong rounded-2xl shadow-2xl relative overflow-hidden">
                  {/* Decorative background element */}
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-600/10 rounded-full blur-3xl" />
                  
                  <h1 className="text-4xl font-black mb-2 text-primary border-b-4 border-green-600 pb-2 inline-block relative">
                      TUJU <span className="text-green-500">GULI</span>
                  </h1>
                  <p className="text-secondary mb-8 mt-4 font-medium italic">"The Marble Master"</p>
                  
                  <div className="space-y-4 mb-10 text-left glass p-5 rounded-xl text-sm border-l-4 border-yellow-500 transition-all">
                      <p className="text-primary font-bold flex items-center gap-2">
                          <span className="text-xl">🎱</span> How to Play:
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-secondary">
                           <li>Take turns with the AI to knock marbles out.</li>
                          <li>Drag your <span className="text-primary font-bold">white striker</span> to aim and shoot.</li>
                          <li>Each marble knocked out is <span className="text-green-500 font-bold">1 point</span>.</li>
                          <li>Most points wins the match!</li>
                      </ul>
                  </div>

                  <div className="space-y-4">
                      <button 
                        onClick={startGame} 
                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-xl shadow-[0_0_20px_rgba(22,163,74,0.3)] transition-all transform hover:scale-[1.02] active:scale-95"
                      >
                          START BATTLE
                      </button>
                      <Link 
                        href="/realms" 
                        className="block py-2 text-secondary hover:text-primary transition-colors text-sm font-medium"
                      >
                        ← Exit Arena
                      </Link>
                  </div>
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
              
              <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-black/40 rounded-full blur-[2px] transform -translate-x-1/2 -translate-y-1/2" />
              
              {/* Marbles */}
              {gameState?.marbles.map(m => !m.isDead && (
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
                    className={`absolute rounded-full shadow-lg z-10 ${gameState.currentTurn === s.id ? 'ring-4 ring-yellow-400 ring-offset-2' : ''}`}
                    style={{
                        left: s.x + RADIUS - s.radius,
                        top: s.y + RADIUS - s.radius,
                        width: s.radius * 2,
                        height: s.radius * 2,
                        background: s.id === 'ai' 
                            ? `radial-gradient(circle at 30% 30%, #ffeb3b, #fbc02d, #f57f17)`
                            : `radial-gradient(circle at 30% 30%, #fff, #ddd, #999)`,
                        boxShadow: s.id === 'ai'
                            ? '0 0 15px rgba(255,215,0,0.5), 2px 2px 5px rgba(0,0,0,0.5)'
                            : '0 0 10px rgba(255,255,255,0.5), 2px 2px 5px rgba(0,0,0,0.5)',
                        border: s.id === 'ai' ? '2px solid #fbc02d' : '2px solid white'
                    }}
                  />
              ))}

              {arrow}

              {/* HUD */}
              <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30">
                  <div className={`bg-white/90 px-4 py-2 rounded-xl shadow-lg border-2 flex flex-col items-center min-w-[80px] ${gameState?.currentTurn !== 'ai' ? 'border-blue-500 scale-110' : 'border-gray-200 opacity-70'}`}>
                      <span className="text-[10px] uppercase font-bold text-gray-500">You</span>
                      <span className="text-xl font-black text-blue-600">{gameState?.scores[userId || 'player'] || 0}</span>
                  </div>
                  
                  <div className="bg-stone-800 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">VS</div>

                  <div className={`bg-white/90 px-4 py-2 rounded-xl shadow-lg border-2 flex flex-col items-center min-w-[80px] ${gameState?.currentTurn === 'ai' ? 'border-yellow-500 scale-110' : 'border-gray-200 opacity-70'}`}>
                      <span className="text-[10px] uppercase font-bold text-gray-500">AI CPU</span>
                      <span className="text-xl font-black text-yellow-600">{gameState?.scores['ai'] || 0}</span>
                  </div>
              </div>

               {/* Turn Status Message */}
               {gameState?.phase === 'aiming' && (
                  <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-bold shadow-xl animate-bounce z-30
                      ${gameState.currentTurn === 'ai' ? 'bg-yellow-500 text-black' : 'bg-blue-600 text-white'}
                  `}>
                      {gameState.currentTurn === 'ai' ? "AI is aiming..." : "Your Turn! Shoot!"}
                  </div>
               )}
          </div>

          {/* End Screen */}
          {phase === 'ended' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
                   <div className="game-card bg-white p-8 rounded-xl text-center shadow-2xl animate-bounce-in max-w-sm border-4 border-green-600">
                       <h2 className="text-4xl font-black mb-2 italic uppercase">
                           {gameState?.winnerId === 'ai' ? (
                               <span className="text-red-600">AI Won!</span>
                           ) : gameState?.winnerId === 'draw' ? (
                               <span className="text-gray-600">Draw!</span>
                           ) : (
                               <span className="text-green-600">Victory!</span>
                           )}
                       </h2>
                       <p className="mb-6 text-gray-600 font-bold">
                           Final Score: {gameState?.scores[userId || 'player'] || 0} - {gameState?.scores['ai'] || 0}
                       </p>

                       {rewards && (
                           <div className="bg-emerald-100 p-4 rounded-xl mb-6 shadow-inner border border-emerald-200">
                               <p className="text-emerald-900 font-bold text-sm mb-1 uppercase tracking-wider">Rewards Earned</p>
                               <div className="flex justify-center gap-6 mt-2">
                                   <span className="text-indigo-950 font-black text-xl">+{rewards.xp} XP</span>
                                   <span className="text-amber-900 font-black text-xl">+{rewards.gold} Gold</span>
                               </div>
                           </div>
                       )}

                       <div className="flex flex-col gap-2">
                           <button onClick={startGame} className="px-6 py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 w-full">Rematch</button>
                           <Link href="/realms" className="px-6 py-3 bg-gray-100 text-gray-500 font-bold rounded hover:bg-gray-200 w-full">Main Menu</Link>
                       </div>
                   </div>
              </div>
          )}
      </div>
  );
}
