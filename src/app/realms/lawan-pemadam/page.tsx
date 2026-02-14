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

  // --- RENDERING ---

  if (phase === 'menu') {
      return (
          <div className="min-h-screen batik-bg flex items-center justify-center p-4">
              <div className="game-card max-sm w-full text-center p-8 glass-strong rounded-2xl shadow-2xl relative overflow-hidden">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />
                  <h1 className="text-4xl font-black mb-2 text-primary border-b-4 border-red-600 pb-2 inline-block relative">
                    LAWAN <span className="text-blue-500">PEMADAM</span>
                  </h1>
                  <p className="text-secondary mb-8 mt-4 font-medium italic">"Rubber Battle Arena"</p>
                  <div className="space-y-4 mb-10 text-left glass p-5 rounded-xl text-sm border-l-4 border-yellow-500 transition-all">
                      <p className="text-primary font-bold flex items-center gap-2">
                        <span className="text-xl">🇲🇾</span> Rules:
                      </p>
                      <ul className="list-disc pl-5 space-y-2 text-secondary">
                          <li>Stack on top of opponent to <span className="text-green-500 font-bold">WIN</span>.</li>
                          <li>Avoid falling off the table edge.</li>
                          <li>Play <span className="text-primary font-bold">Best of 3</span> or <span className="text-primary font-bold">5</span>!</li>
                      </ul>
                  </div>
                  <div className="space-y-4">
                      <button onClick={() => setPhase('selection')} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl text-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all transform hover:scale-[1.02] active:scale-95">
                          PLAY NOW
                      </button>
                      <Link href="/realms" className="block py-2 text-secondary hover:text-primary transition-colors text-sm font-medium">
                        ← Exit Class
                      </Link>
                  </div>
              </div>
          </div>
      );
  }

  if (phase === 'selection') {
      return (
          <div className="min-h-screen batik-bg flex items-center justify-center p-4">
               <div className="game-card max-w-2xl w-full text-center p-8 glass-strong rounded-2xl shadow-2xl relative overflow-hidden">
                   <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl" />
                   <h2 className="text-3xl font-black mb-6 text-primary uppercase italic relative">Choose Your <span className="text-blue-500">Eraser</span></h2>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 relative">
                       {flags.map(f => (
                           <button 
                             key={f}
                             onClick={() => setSelectedFlag(f)}
                             className={`aspect-[2/3] p-1 rounded-xl transition-all transform hover:scale-105 ${selectedFlag === f ? 'ring-4 ring-blue-500 scale-110 shadow-[0_0_20px_rgba(59,130,246,0.5)]' : 'opacity-60 hover:opacity-100'}`}
                           >
                               <div className="w-full h-full rounded-lg overflow-hidden border border-white/10 shadow-lg bg-black/20">
                                   <FlagRendererInline flag={f} />
                               </div>
                               <p className="mt-3 text-xs font-black uppercase tracking-widest text-secondary">{f}</p>
                           </button>
                       ))}
                   </div>
                   <h3 className="text-xl font-bold mb-4 text-primary relative">Match Length</h3>
                   <div className="flex justify-center gap-4 mb-10 relative">
                       {[1, 3, 5].map(n => (
                           <button key={n} onClick={() => setBestOf(n)} className={`px-8 py-3 rounded-xl font-black transition-all border-2 ${bestOf === n ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white/5 text-secondary border-white/10 hover:border-blue-400 hover:text-primary'}`}>
                               Best of {n}
                           </button>
                       ))}
                   </div>
                   <div className="flex gap-4 justify-center relative">
                        <button onClick={() => setPhase('menu')} className="px-8 py-3 glass text-secondary font-bold rounded-xl hover:text-primary transition-all">Back</button>
                        <button onClick={startGame} className="px-10 py-3 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl shadow-lg transform transition active:scale-95 animate-pulse">BATTLE! ⚔️</button>
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
          <div className={`absolute h-0 border-t-4 border-dashed border-${color}-400 origin-left z-20`} style={{ left: dragStart.x, top: dragStart.y, width: Math.min(len, 300), transform: `rotate(${angle}deg)` }}>
             <div className={`absolute right-0 -top-2 w-4 h-4 bg-${color}-500 rounded-full`} />
          </div>
      );
  }

  return (
      <div className="min-h-screen bg-slate-900 overflow-hidden flex items-center justify-center p-4 select-none">
          <div ref={containerRef} className="relative w-[800px] h-[600px] bg-[#e3dcd2] rounded-lg shadow-2xl border-[16px] border-[#5d4037] overflow-hidden" style={{ backgroundImage: 'url("/patterns/wood-grain.png")', boxShadow: 'inset 0 0 100px rgba(0,0,0,0.3)', perspective: '1200px' }}
             onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp}>
              
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

              {gameState?.erasers.map(e => (
                  <div key={e.id}>
                      <div className="absolute bg-black/30 rounded-full blur-sm" style={{ left: e.x, top: e.y, width: e.width, height: e.height, marginLeft: -e.width/2, marginTop: -e.height/2, transform: `rotate(${e.rotation}deg) scale(${1 + (e.z || 0)/500})`, opacity: Math.max(0.1, 1 - (e.z || 0)/200) }} />
                      <div className="absolute shadow-sm" style={{ left: e.x, top: e.y, width: e.width, height: e.height, marginLeft: -e.width/2, marginTop: -e.height/2, transform: `translate3d(0, ${-(e.z || 0)}px, 0) rotateZ(${e.rotation}deg) rotateX(${e.rotationX || 0}deg)`, backgroundColor: 'white', boxShadow: `0 ${(e.z || 0)/5 + 2}px ${(e.z || 0)/5 + 4}px rgba(0,0,0,0.4)`, transformStyle: 'preserve-3d' }}>
                            <div className="w-full h-full pointer-events-none">
                                <FlagRendererInline flag={e.flag} />
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                      </div>
                  </div>
              ))}

              {arrow}

              {gameState?.phase === 'aiming' && (
                  <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full font-bold shadow-lg z-30 animate-bounce ${gameState?.currentTurn === 'player' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                      {gameState?.currentTurn === 'player' ? 'YOUR TURN' : 'CPU TURN'}
                  </div>
              )}
          
              <AnimatePresence>
              {gameState?.phase === 'round_over' && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/50 z-40 flex items-center justify-center p-4">
                      <div className="bg-white p-6 rounded-xl shadow-2xl text-center max-w-sm w-full border-4 border-yellow-400">
                          <h3 className="text-2xl font-bold mb-2 text-black">Round Over!</h3>
                          <div className="flex justify-center gap-8 text-xl font-bold mb-6">
                              <div className="text-blue-600">You: {gameState.match.playerWins}</div>
                              <div className="text-red-600">CPU: {gameState.match.aiWins}</div>
                          </div>
                          <button onClick={handleNextRound} className="w-full py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-extrabold rounded-lg text-lg shadow-md transform transition active:scale-95">NEXT ROUND ➡️</button>
                      </div>
                  </motion.div>
              )}
              </AnimatePresence>
          </div>

          {phase === 'ended' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50 p-4">
                   <div className="game-card glass-strong p-10 rounded-2xl text-center shadow-2xl border-4 border-blue-600/50 max-w-md w-full relative overflow-hidden animate-bounce-in">
                       <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl opacity-50" />
                       <h2 className="text-5xl font-black mb-6 uppercase italic tracking-tighter relative">
                           {gameState?.winnerId === 'player' ? <span className="text-blue-500 [text-shadow:0_0_20px_rgba(59,130,246,0.5)]">Victory!</span> : <span className="text-red-500 [text-shadow:0_0_20px_rgba(239,68,68,0.5)]">Defeat</span>}
                       </h2>
                       <div className="relative mb-8">
                         <p className="text-secondary font-bold uppercase tracking-widest text-xs mb-1">Final Score</p>
                         <p className="text-3xl text-primary font-black">{gameState?.match.playerWins} <span className="text-secondary/50 mx-2">-</span> {gameState?.match.aiWins}</p>
                       </div>
                       {rewards && (
                           <div className="glass p-6 rounded-2xl mb-10 shadow-inner border border-white/5 relative bg-white/5">
                               <p className="text-blue-400 font-black text-xs uppercase tracking-[0.2em] mb-4">Rewards Earned</p>
                               <div className="flex justify-center gap-8">
                                   <div className="flex flex-col items-center">
                                     <span className="text-amber-500 font-black text-2xl">+{rewards.gold}</span>
                                     <span className="text-[10px] text-amber-500/50 uppercase font-black">Gold</span>
                                   </div>
                                   <div className="w-px h-10 bg-white/10" />
                                   <div className="flex flex-col items-center">
                                     <span className="text-indigo-400 font-black text-2xl">+{rewards.xp}</span>
                                     <span className="text-[10px] text-indigo-400/50 uppercase font-black">XP</span>
                                   </div>
                               </div>
                           </div>
                       )}
                       <div className="flex flex-col gap-3 relative">
                           <button onClick={() => setPhase('selection')} className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:scale-[1.02]">PLAY AGAIN</button>
                           <button onClick={() => setPhase('menu')} className="px-6 py-4 glass text-secondary font-bold rounded-xl hover:text-primary transition-all">MAIN MENU</button>
                       </div>
                   </div>
              </div>
          )}
      </div>
  );
}
