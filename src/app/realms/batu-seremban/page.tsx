'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { LawanPemadamEngine } from '@/game-engine/realms/lawan-pemadam/LawanPemadamEngine';
import { createClient } from '@/lib/supabase/client';
import { submitGameResult } from '@/lib/game-actions';
import { type LawanPemadamState } from '@/types';
// FlagRenderer is now inline to avoid import errors

const FlagRendererInline = ({ flag }: { flag: string }) => {
  const common = "w-full h-full relative overflow-hidden shadow-inner border border-black/10";
  switch (flag) {
    case 'malaysia':
      return <div className={common}><div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,#cc0001_0%,#cc0001_14.2%,#ffffff_14.2%,#ffffff_28.5%)]" /><div className="absolute top-0 left-0 w-1/2 h-1/2 bg-[#010066] flex items-center justify-center"><div className="w-1/2 h-1/2 bg-[#ffcc00] rounded-full moon-shape" /></div></div>;
    case 'uk':
      return <div className={`${common} bg-[#012169]`}><div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-1/5 bg-white absolute rotate-45" /><div className="w-full h-1/5 bg-white absolute -rotate-45" /><div className="w-[120%] h-[10%] bg-[#C8102E] absolute rotate-45" /><div className="w-[120%] h-[10%] bg-[#C8102E] absolute -rotate-45" /><div className="absolute w-full h-1/3 bg-white" /><div className="absolute h-full w-1/3 bg-white" /><div className="absolute w-full h-1/4 bg-[#C8102E]" /><div className="absolute h-full w-1/4 bg-[#C8102E]" /></div></div>;
    case 'usa': return <div className={common}><div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,#B22234_0%,#B22234_14.2%,#ffffff_14.2%,#ffffff_28.5%)]" /><div className="absolute top-0 left-0 w-1/2 h-1/2 bg-[#3C3B6E] p-1 grid grid-cols-5 gap-0.5">{Array.from({length:15}).map((_,i) => <div key={i} className="bg-white rounded-full w-0.5 h-0.5" />)}</div></div>;
    case 'indonesia': return <div className={common}><div className="absolute top-0 w-full h-1/2 bg-[#FF0000]" /><div className="absolute bottom-0 w-full h-1/2 bg-white" /></div>;
    case 'japan': return <div className={`${common} bg-white flex items-center justify-center`}><div className="w-1/2 h-1/2 bg-[#BC002D] rounded-full" /></div>;
    case 'palestine': return <div className={common}><div className="absolute top-0 w-full h-1/3 bg-black" /><div className="absolute top-1/3 w-full h-1/3 bg-white" /><div className="absolute bottom-0 w-full h-1/3 bg-[#009736]" /><div className="absolute top-0 left-0 w-1/2 h-full bg-[#ED2E38]" style={{ clipPath: 'polygon(0 0, 100% 50%, 0 100%)' }} /></div>;
    case 'brazil': return <div className={`${common} bg-[#009C3B] flex items-center justify-center`}><div className="w-[80%] h-[60%] bg-[#FFDF00]" style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }} /><div className="absolute w-[30%] h-[30%] bg-[#002776] rounded-full" /></div>;
    default: return <div className="bg-gray-300 w-full h-full" />;
  }
};

export default function LawanPemadamPage() {
  const [phase, setPhase] = useState<'menu' | 'selection' | 'playing' | 'ended'>('menu');
  const engineRef = useRef<LawanPemadamEngine | null>(null);
  const [gameState, setGameState] = useState<LawanPemadamState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  
  // Selection
  const [selectedFlag, setSelectedFlag] = useState<string>('malaysia');
  const [bestOf, setBestOf] = useState<number>(3); // Default Best of 3
  const flags = ['malaysia', 'uk', 'usa', 'indonesia', 'japan', 'palestine', 'brazil'];
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
    const engine = new LawanPemadamEngine();
    engine.initialize({
      mode: 'solo',
      players: [{ id: 'player', username: 'Player', score: 0, isAI: false, isActive: true }],
      playerFlag: selectedFlag,
      bestOf: bestOf
    } as any);
    
    engineRef.current = engine;
    setGameState(engine.getState());
    setPhase('playing');
    setRewards(null);
    lastTimeRef.current = performance.now();
    requestAnimationFrame(gameLoop);
  }, [selectedFlag, bestOf]);

  const gameLoop = (time: number) => {
    const engine = engineRef.current;
    if (!engine || phase === 'ended') return; 

    // Check Match End
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

  const handleSubmitResult = async (engine: LawanPemadamEngine) => {
      const uid = userIdRef.current;
      if (!uid) return;
      const state = engine.getState();
      const isWin = state.winnerId === 'player';
      
      const result = {
          winnerId: isWin ? uid : null,
          scores: { [uid]: isWin ? 100 : 0 },
          duration: 0, 
          isDraw: false,
          xpEarned: 0,
          goldEarned: 0
      };
      
      const res = await submitGameResult('batu-seremban', 'solo', result, uid);
      if (res.success && res.xp !== undefined) {
         setRewards({ xp: res.xp, gold: res.gold || 0 });
      }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      if (!gameState || gameState.phase !== 'aiming' || gameState.currentTurn !== 'player') return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      const player = gameState.erasers.find(er => er.id === 'player');
      if (!player) return;

      const dx = clickX - player.x;
      const dy = clickY - player.y;
      
      if (dx*dx + dy*dy < 5000) { 
          setDragStart({ x: player.x, y: player.y });
          setDragCurrent({ x: clickX, y: clickY });
      }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
      if (!dragStart) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDragCurrent({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handlePointerUp = () => {
      if (!dragStart || !dragCurrent) return;
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const forceMult = 6;
      engineRef.current?.applyForce('player', dx * forceMult, dy * forceMult);
      setDragStart(null);
      setDragCurrent(null);
  };

  const handleNextRound = () => {
      engineRef.current?.startNextRound();
      // Need to force update state immediately to remove 'round_over' UI?
      // update loop will catch it, but we can manually trigger update
      if (engineRef.current) setGameState(engineRef.current.getState());
  };

  // --- RENDERING ---

  if (phase === 'menu') {
      return (
          <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
              <div className="game-card max-w-md w-full text-center p-8 bg-white rounded-xl shadow-2xl">
                  <h1 className="text-4xl font-bold mb-2 text-blue-900 border-b-4 border-red-600 pb-2 inline-block">LAWAN PEMADAM</h1>
                  <p className="text-gray-600 mb-8 mt-4 font-serif">"Rubber Battle Arena"</p>
                  
                  <div className="space-y-4 mb-8 text-left bg-gray-100 p-4 rounded-lg text-sm border-l-4 border-yellow-500">
                      <p>🇲🇾 <strong>Rules:</strong></p>
                      <ul className="list-disc pl-5 space-y-1 text-gray-700">
                          <li>Stack on top of opponent to WIN.</li>
                          <li>Avoid falling off the table.</li>
                          <li>Play <strong>Best of 3</strong> or <strong>5</strong>!</li>
                      </ul>
                  </div>

                  <button onClick={() => setPhase('selection')} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xl shadow-lg transition transform active:scale-95">
                      PLAY NOW
                  </button>
                  <Link href="/realms" className="block mt-4 text-gray-500 hover:text-gray-800">Exit Class</Link>
              </div>
          </div>
      );
  }

  if (phase === 'selection') {
      return (
          <div className="min-h-screen bg-slate-800 flex items-center justify-center p-4">
               <div className="game-card max-w-2xl w-full text-center p-8 bg-white rounded-xl shadow-2xl">
                   <h2 className="text-3xl font-bold mb-4 text-blue-900">Choose Your Eraser</h2>
                   
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                       {flags.map(f => (
                           <button 
                             key={f}
                             onClick={() => setSelectedFlag(f)}
                             className={`aspect-[2/3] p-1 rounded-lg transition-all transform hover:scale-105 ${selectedFlag === f ? 'ring-4 ring-blue-500 scale-110 shadow-xl' : 'opacity-80 hover:opacity-100'}`}
                           >
                               <div className="w-full h-full rounded overflow-hidden border border-gray-300 shadow bg-gray-100">
                                   <FlagRendererInline flag={f} />
                               </div>
                               <p className="mt-2 text-sm font-bold capitalize text-gray-700">{f}</p>
                           </button>
                       ))}
                   </div>

                   <h3 className="text-xl font-bold mb-4 text-gray-800">Match Length</h3>
                   <div className="flex justify-center gap-4 mb-8">
                       {[1, 3, 5].map(n => (
                           <button
                             key={n}
                             onClick={() => setBestOf(n)}
                             className={`px-6 py-2 rounded-lg font-bold border-2 ${bestOf === n ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                           >
                               Best of {n}
                           </button>
                       ))}
                   </div>

                   <div className="flex gap-4 justify-center">
                        <button onClick={() => setPhase('menu')} className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">
                            Back
                        </button>
                        <button onClick={startGame} className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded shadow-lg text-lg animate-pulse">
                            BATTLE! ⚔️
                        </button>
                   </div>
               </div>
          </div>
      );
  }

  // Render Arrow
  let arrow = null;
  if (dragStart && dragCurrent) {
      const dx = dragStart.x - dragCurrent.x;
      const dy = dragStart.y - dragCurrent.y;
      const len = Math.sqrt(dx*dx + dy*dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      const power = len / 200; 
      const color = power > 0.8 ? 'red' : power > 0.4 ? 'orange' : 'green';

      arrow = (
          <div 
            className={`absolute h-0 border-t-4 border-dashed border-${color}-400 origin-left z-20`}
            style={{
                left: dragStart.x,
                top: dragStart.y,
                width: Math.min(len, 300),
                transform: `rotate(${angle}deg)`
            }}
          >
             <div className={`absolute right-0 -top-2 w-4 h-4 bg-${color}-500 rounded-full`} />
          </div>
      );
  }

  return (
      <div className="min-h-screen bg-slate-900 overflow-hidden flex items-center justify-center p-4 select-none">
          {/* Table */}
          <div 
             ref={containerRef}
             className="relative w-[800px] h-[600px] bg-[#e3dcd2] rounded-lg shadow-2xl border-[16px] border-[#5d4037] overflow-hidden"
             style={{
                 backgroundImage: 'url("/patterns/wood-grain.png")', 
                 boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)',
                 perspective: '1200px'
             }}
             onPointerDown={handlePointerDown}
             onPointerMove={handlePointerMove}
             onPointerUp={handlePointerUp}
             onPointerLeave={handlePointerUp}
          >
              {/* Scoreboard */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 px-8 py-3 rounded-full font-bold shadow-xl z-30 flex gap-8 text-xl border-2 border-slate-200">
                  <div className="text-blue-700 flex items-center gap-2">
                       <span>YOU</span>
                       <span className="bg-blue-100 px-2 py-0.5 rounded text-2xl">{gameState?.match.playerWins}</span>
                  </div>
                  <div className="text-gray-400">vs</div>
                  <div className="text-red-700 flex items-center gap-2">
                       <span className="bg-red-100 px-2 py-0.5 rounded text-2xl">{gameState?.match.aiWins}</span>
                       <span>CPU</span>
                  </div>
              </div>

              <div className="absolute top-20 left-1/2 -translate-x-1/2 text-gray-500 font-bold bg-white/50 px-3 py-1 rounded-full text-sm">
                  Round {gameState?.match.currentRound} / Best of {Math.ceil((gameState?.match.targetWins || 1)*2 - 1)}
              </div>

              {/* Erasers */}
              {gameState?.erasers.map(e => (
                  <div key={e.id}>
                      <div 
                        className="absolute bg-black/30 rounded-full blur-sm"
                        style={{
                            left: e.x, top: e.y, width: e.width, height: e.height,
                            marginLeft: -e.width/2, marginTop: -e.height/2,
                            transform: `rotate(${e.rotation}deg) scale(${1 + (e.z || 0)/500})`,
                            opacity: Math.max(0.1, 1 - (e.z || 0)/200)
                        }}
                      />
                      <div
                        className="absolute shadow-sm"
                        style={{
                            left: e.x, top: e.y, width: e.width, height: e.height,
                            marginLeft: -e.width/2, marginTop: -e.height/2,
                            transform: `translate3d(0, ${-(e.z || 0)}px, 0) rotateZ(${e.rotation}deg) rotateX(${e.rotationX || 0}deg)`,
                            backgroundColor: 'white',
                            boxShadow: `0 ${(e.z || 0)/5 + 2}px ${(e.z || 0)/5 + 4}px rgba(0,0,0,0.4)`,
                            transformStyle: 'preserve-3d',
                        }}
                      >
                            <div className="w-full h-full pointer-events-none">
                                <FlagRendererInline flag={e.flag} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                      </div>
                  </div>
              ))}

              {arrow}

              {/* Turn Indicator */}
              {gameState?.phase === 'aiming' && (
                  <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-bold shadow-lg z-30 animate-bounce
                      ${gameState?.currentTurn === 'player' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}
                  `}>
                      {gameState?.currentTurn === 'player' ? 'YOUR TURN' : 'CPU TURN'}
                  </div>
              )}
          
              {/* Round Over Modal */}
              <AnimatePresence>
              {gameState?.phase === 'round_over' && (
                  <motion.div 
                     initial={{ opacity: 0, scale: 0.9 }}
                     animate={{ opacity: 1, scale: 1 }}
                     exit={{ opacity: 0 }}
                     className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
                  >
                      <div className="bg-white p-6 rounded-xl shadow-2xl text-center max-w-sm w-full border-4 border-yellow-400">
                          <h3 className="text-2xl font-bold mb-2">Round Over!</h3>
                          <div className="flex justify-center gap-8 text-xl font-bold mb-6">
                              <div className="text-blue-600">You: {gameState.match.playerWins}</div>
                              <div className="text-red-600">CPU: {gameState.match.aiWins}</div>
                          </div>
                          <button onClick={handleNextRound} className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold rounded-lg text-lg shadow-md transform transition active:scale-95">
                              NEXT ROUND ➡️
                          </button>
                      </div>
                  </motion.div>
              )}
              </AnimatePresence>
          </div>

          {/* Match End Screen */}
          {phase === 'ended' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
                   <div className="game-card bg-white p-8 rounded-xl text-center shadow-2xl animate-bounce-in border-4 border-blue-600 max-w-md w-full">
                       <h2 className="text-4xl font-black mb-4 uppercase italic">
                           {gameState?.winnerId === 'player' ? <span className="text-blue-600">Victory!</span> : <span className="text-red-600">Defeat</span>}
                       </h2>
                       <p className="mb-6 text-xl text-gray-700 font-bold">
                           Final Score: {gameState?.match.playerWins} - {gameState?.match.aiWins}
                       </p>
                       <div className="h-px bg-gray-200 mb-6" />
                       {rewards && (
                           <div className="bg-blue-100 p-4 rounded-xl mb-6 shadow-inner border border-blue-200">
                               <p className="text-blue-900 font-bold text-lg mb-1">Rewards Earned</p>
                               <div className="flex justify-center gap-4 mt-2">
                                   <span className="text-amber-800 font-black text-xl">+{rewards.gold} Gold</span>
                                   <span className="text-indigo-900 font-black text-xl">+{rewards.xp} XP</span>
                               </div>
                           </div>
                       )}
                       <div className="flex flex-col gap-3">
                           <button onClick={() => setPhase('selection')} className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">Play Again</button>
                           <button onClick={() => setPhase('menu')} className="px-6 py-3 bg-gray-200 text-gray-700 font-bold rounded hover:bg-gray-300">Main Menu</button>
                       </div>
                   </div>
              </div>
          )}
      </div>
  );
}
