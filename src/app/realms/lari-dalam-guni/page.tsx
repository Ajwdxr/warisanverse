'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { LariGuniEngine } from '@/game-engine/realms/lari-dalam-guni/LariGuniEngine'; // Import failure? Need to check path
import { createClient } from '@/lib/supabase/client';
import { submitGameResult } from '@/lib/game-actions';
import { type LariGuniState, type LariGuniPlayer } from '@/types';

// ---- Sound system ----
function playSound(name: string) {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {}
}

export default function LariGuniPage() {
  const [phase, setPhase] = useState<'menu' | 'playing' | 'ended'>('menu');
  const engineRef = useRef<LariGuniEngine | null>(null);
  const [gameState, setGameState] = useState<LariGuniState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [rewards, setRewards] = useState<{ xp: number; gold: number } | null>(null);

  // Load User
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

  const prevState = useRef<LariGuniState | null>(null);

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
    const newState = engine.getState();
    
    // Play jump sound if any player state changed to 'jumping'
    if (prevState.current) {
        newState.players.forEach((p: any, i: number) => {
            const oldP = prevState.current?.players[i];
            if (p.state === 'jumping' && oldP?.state !== 'jumping') {
                playSound('jump');
            }
        });
    }
    prevState.current = newState;

    setGameState(newState);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  };

  const startGame = useCallback(() => {
    const engine = new LariGuniEngine();
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

  const handleSubmitResult = async (engine: LariGuniEngine) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const state = engine.getState();
      const isWin = state.winnerId === 'player' || state.players.find((p: any) => p.id === 'player')?.id === state.winnerId;
      
      const result = {
          winnerId: isWin ? uid : null,
          scores: { [uid]: isWin ? 100 : 0 },
          duration: 0, 
          isDraw: false,
          xpEarned: 0,
          goldEarned: 0
      };
      
      const res = await submitGameResult('gasing', 'solo', result, uid);
      if (res.success && res.xp !== undefined) {
         setRewards({ xp: res.xp, gold: res.gold || 0 });
      }
  };

  // Controls
  const handlePointerDown = () => {
      engineRef.current?.startCharge(userId || 'player'); // Fallback ID?
      // Engine initializes with config.players[0].id.
      // My config uses 'player'.
      // If userId is null, I use 'player'.
      const pid = userId || 'player'; 
      // Wait. InitializeConfig uses 'player' ID? 
      // Lines 30: id: 'player'.
      // So I should use 'player' to control my character.
      engineRef.current?.startCharge('player');
  };

  const handlePointerUp = () => {
      engineRef.current?.releaseCharge('player');
  };

  // Prevent context menu on hold
  const preventContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
  };

  if (phase === 'menu') {
      return (
          <div className="min-h-screen bg-sky-900 flex flex-col items-center justify-center p-4">
              <div className="game-card max-w-md w-full text-center p-8 bg-white/10 backdrop-blur-md rounded-3xl border border-white/20">
                  <h1 className="text-4xl font-bold mb-2 text-amber-400 drop-shadow-md">Lari Dalam Guni</h1>
                  <p className="text-white/80 mb-8 italic">Hop your way to victory! (Kampung Style)</p>
                  
                  <div className="space-y-4 mb-8 text-left bg-black/30 p-4 rounded-xl text-sm text-gray-200">
                      <p>🏃 <strong>How to Play:</strong></p>
                      <ul className="list-disc pl-5 space-y-1">
                          <li>Hold <span className="text-yellow-300">Space</span> or <span className="text-yellow-300">Touch</span> to charge jump.</li>
                          <li>Release to HOP forward!</li>
                          <li>Don't overcharge or you'll stumble (not implemented yet, but careful!).</li>
                          <li>Beat <strong>Kampung Bot</strong> to the finish line!</li>
                      </ul>
                  </div>

                  <button onClick={startGame} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-xl text-xl shadow-lg transform transition active:scale-95">
                      MULA! (Start)
                  </button>
                  <Link href="/realms" className="block mt-4 text-white/50 hover:text-white">Back to Village</Link>
              </div>
          </div>
      );
  }

  // Rendering
  const player = gameState?.players.find(p => p.id === 'player');
  const ai = gameState?.players.find(p => p.isAI);
  const camX = gameState?.cameraX || 0;

  return (
      <div 
        className="min-h-screen bg-sky-300 overflow-hidden relative select-none"
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchEnd={handlePointerUp}
        onContextMenu={preventContextMenu}
      >
          {/* Sky / Parallax Background */}
          <div className="absolute inset-0 bg-[url('/patterns/clouds.png')] opacity-50 bg-repeat-x animate-drift" />
          
          {/* Ground */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-amber-700 border-t-8 border-green-600">
              {/* Grass pattern */}
              <div className="w-full h-4 bg-green-500/50" />
          </div>

          {/* Game World Container (Camera Transform) */}
          <div 
            className="absolute inset-0" 
            style={{ 
                transform: `translateX(${-camX + 100}px)` // Offset to keep player left-ish
            }}
          >
              {/* Finish Line */}
              <div className="absolute bottom-32 w-4 h-64 bg-checkered" style={{ left: gameState?.finishLineX }}>
                  <div className="absolute -top-8 -left-12 bg-red-600 text-white px-2 py-1 rounded font-bold">FINISH</div>
              </div>

              {/* Players */}
              {gameState?.players.map(p => (
                  <motion.div
                    key={p.id}
                    className="absolute bottom-32 w-16 h-24"
                    style={{ left: p.x }}
                    animate={{ y: -p.y }} // Physics Y is up, CSS Y is down (negative)
                    transition={{ type: 'tween', ease: 'linear', duration: 0 }} // Physics driven
                  >
                      {/* Sack Body */}
                      <div className={`w-full h-full rounded-b-2xl rounded-t-lg relative shadow-xl overflow-hidden
                          ${p.id === 'player' ? 'bg-amber-600' : 'bg-gray-600'}
                      `}>
                           {/* Sack texture lines */}
                           <div className="w-full h-full opacity-20 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,#000_5px,#000_6px)]" />
                           <div className="absolute top-2 w-full text-center font-bold text-white text-xs opacity-80">{p.name}</div>
                      </div>
                      {/* Head */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-10 h-10 bg-yellow-200 rounded-full border-2 border-black/20" />
                  </motion.div>
              ))}
          </div>

          {/* HUD */}
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between pointer-events-none">
              <div className="bg-black/40 text-white px-4 py-2 rounded-xl backdrop-blur-md">
                   <p className="font-bold">Distance: {Math.floor(player?.x || 0)}m / {gameState?.finishLineX}m</p>
              </div>
              
              {/* Charge Bar */}
              <div className="bg-black/40 p-2 rounded-xl backdrop-blur-md w-48">
                  <p className="text-xs text-white mb-1">Jump Power</p>
                  <div className="w-full h-4 bg-gray-700 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-yellow-400"
                        style={{ width: `${player?.charge || 0}%` }}
                      />
                  </div>
              </div>
          </div>

          {/* End Screen */}
          {phase === 'ended' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-50">
                  <div className="game-card bg-white p-8 rounded-3xl text-center max-w-sm animate-bounce-in">
                      <h2 className="text-3xl font-bold mb-4">
                          {gameState?.winnerId === 'player' ? '🏆 VICTORY!' : '😢 KALAH...'}
                      </h2>
                      <p className="text-gray-600 mb-6">
                          {gameState?.winnerId === 'player' ? 'You are the Kampung Champion!' : 'Kampung Bot was faster.'}
                      </p>
                      
                      {rewards && (
                          <div className="bg-amber-100 p-4 rounded-xl mb-6 shadow-inner border border-amber-200">
                              <p className="font-bold text-amber-800">Rewards:</p>
                              <p className="text-amber-950 font-black text-xl">+{rewards.xp} XP | +{rewards.gold} Gold</p>
                          </div>
                      )}

                      <button onClick={startGame} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl hover:bg-green-600">
                          Main Lagi (Play Again)
                      </button>
                      <Link href="/realms" className="block mt-4 text-gray-400 hover:text-gray-600">Exit</Link>
                  </div>
              </div>
          )}
      </div>
  );
}
