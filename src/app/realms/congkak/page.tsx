'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { CongkakEngine } from '@/game-engine/realms/congkak/CongkakEngine';
import { CongkakAI, type AIDifficulty } from '@/game-engine/realms/congkak/CongkakAI';
import { CONGKAK_PITS } from '@/lib/constants';
import type { CongkakBoardState, PowerCard, GameMode, MatchResult } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { submitGameResult } from '@/lib/game-actions';

// ---- Sound system ----
function playSound(name: string) {
  if (typeof window === 'undefined') return;
  try {
    const audio = new Audio(`/sounds/${name}.mp3`);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {}
}

type GamePhase = 'menu' | 'mode_select' | 'playing' | 'ended';

const MODE_INFO: Record<string, { label: string; desc: string; icon: string; color: string }> = {
  casual: { label: 'Casual', desc: 'No power cards, just classic Congkak', icon: '☕', color: '#27ae60' },
  ai: { label: 'AI Battle', desc: 'Play vs AI with power cards & combos', icon: '🤖', color: '#3498db' },
  ranked: { label: 'Ranked', desc: 'Competitive mode with rank points', icon: '⚔️', color: '#e74c3c' },
};

const DIFFICULTY_INFO: Record<AIDifficulty, { label: string; desc: string; stars: number; color: string }> = {
  easy: { label: 'Pemula', desc: 'Random moves', stars: 1, color: '#2ecc71' },
  medium: { label: 'Mahir', desc: 'Greedy strategy', stars: 2, color: '#f39c12' },
  hard: { label: 'Pahlawan', desc: 'Minimax AI', stars: 3, color: '#e74c3c' },
};

// Marble component — renders individual seeds as animated circles
function Marble({ index, total, color }: { index: number; total: number; color: string }) {
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
  const radius = total > 4 ? 14 : total > 2 ? 10 : 6;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius;
  const size = total > 7 ? 5 : total > 4 ? 6 : 7;

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: index * 0.02, type: 'spring', stiffness: 400, damping: 15 }}
      className="absolute rounded-full"
      style={{
        width: size,
        height: size,
        left: `calc(50% + ${x}px - ${size / 2}px)`,
        top: `calc(50% + ${y}px - ${size / 2}px)`,
        background: `radial-gradient(circle at 30% 30%, ${color}, ${color}88)`,
        boxShadow: `0 0 4px ${color}66, inset 0 1px 2px rgba(255,255,255,0.3)`,
      }}
    />
  );
}

// Pit render with animated marbles
function PitWithMarbles({
  seeds,
  color,
  isClickable,
  isHighlighted,
  onClick,
  label,
}: {
  seeds: number;
  color: string;
  isClickable: boolean;
  isHighlighted: boolean;
  onClick?: () => void;
  label: string;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={!isClickable}
      whileHover={isClickable ? { scale: 1.08 } : undefined}
      whileTap={isClickable ? { scale: 0.95 } : undefined}
      className={`congkak-pit-modern relative ${isClickable ? 'clickable' : 'disabled'} ${isHighlighted ? 'highlighted' : ''}`}
      aria-label={label}
    >
      {/* Marble container */}
      <div className="absolute inset-0">
        {Array.from({ length: Math.min(seeds, 20) }).map((_, i) => (
          <Marble key={`${i}-${seeds}`} index={i} total={seeds} color={color} />
        ))}
      </div>
      {/* Seed count */}
      <span className="relative z-10 text-xs font-bold tabular-nums" style={{ color }}>
        {seeds}
      </span>
    </motion.button>
  );
}

// Energy bar
function EnergyBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = (value / max) * 100;
  return (
    <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden border border-[var(--border-color)]">
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}88, ${color})` }}
        animate={{ width: `${pct}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    </div>
  );
}

// Combo display
function ComboDisplay({ combo, multiplier }: { combo: number; multiplier: number }) {
  if (combo === 0) return null;
  return (
    <motion.div
      initial={{ scale: 0, rotate: -15 }}
      animate={{ scale: 1, rotate: 0 }}
      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-600/30 to-orange-600/30 border border-amber-500/40"
    >
      <span className="text-xs font-bold text-amber-300">🔥 x{multiplier.toFixed(2)}</span>
      <span className="text-[10px] text-amber-400/70">COMBO {combo}</span>
    </motion.div>
  );
}

// Power card button
function PowerCardButton({
  card,
  isActive,
  canAfford,
  onUse,
}: {
  card: PowerCard;
  isActive: boolean;
  canAfford: boolean;
  onUse: () => void;
}) {
  if (card.used) return (
    <div className="opacity-30 flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
      <span className="text-lg grayscale">{card.icon}</span>
      <div className="text-left">
        <p className="text-[10px] font-medium line-through text-[var(--text-secondary)]">{card.name}</p>
      </div>
    </div>
  );

  return (
    <motion.button
      whileHover={canAfford ? { scale: 1.03 } : undefined}
      whileTap={canAfford ? { scale: 0.97 } : undefined}
      onClick={onUse}
      disabled={!canAfford}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
        isActive
          ? 'bg-primary-600/30 border-primary-500/60 neon-glow'
          : canAfford
          ? 'bg-[var(--bg-elevated)] border-[var(--border-color)] hover:border-primary-500/40 hover:bg-primary-600/10'
          : 'opacity-40 bg-[var(--bg-elevated)] border-[var(--border-color)] cursor-not-allowed'
      }`}
    >
      <span className="text-lg">{card.icon}</span>
      <div>
        <p className="text-[10px] font-bold">{card.name}</p>
        <p className="text-[9px] text-[var(--text-secondary)]">⚡{card.cost}</p>
      </div>
    </motion.button>
  );
}

export default function CongkakPage() {
  const [phase, setPhase] = useState<GamePhase>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('ai');
  const [difficulty, setDifficulty] = useState<AIDifficulty>('medium');
  const engineRef = useRef<CongkakEngine | null>(null);
  const aiRef = useRef<CongkakAI | null>(null);
  const [boardState, setBoardState] = useState<CongkakBoardState | null>(null);
  const [message, setMessage] = useState('');
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [activePowerCardId, setActivePowerCardId] = useState<string | null>(null);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [rewards, setRewards] = useState<{ xp: number; gold: number } | null>(null);
  const [activeAnim, setActiveAnim] = useState<{ side: number; pit: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    checkUser();
  }, []);

  const startGame = useCallback(() => {
    const engine = new CongkakEngine();
    engine.initialize({
      mode: gameMode,
      players: [
        { id: 'player', username: 'You', score: 0, isAI: false, isActive: true },
        { id: 'ai', username: 'AI', score: 0, isAI: true, isActive: true },
      ],
      difficulty,
    });
    engineRef.current = engine;
    aiRef.current = new CongkakAI(difficulty);
    setBoardState(engine.getState());
    setPhase('playing');
    setMessage('Your turn — choose a pit to sow seeds');
    setActivePowerCardId(null);
    setMoveCount(0);
    setRewards(null); // Reset rewards
    playSound('click');
  }, [gameMode, difficulty]);

  const handlePowerCard = useCallback((cardId: string) => {
    const engine = engineRef.current;
    if (!engine || isAIThinking) return;
    const state = engine.getState();
    if (state.currentPlayer !== 0) return;

    if (activePowerCardId === cardId) {
      setActivePowerCardId(null);
      return;
    }

    const success = engine.usePowerCard(cardId);
    if (success) {
      setActivePowerCardId(cardId);
      const card = state.powerCards[0].find(c => c.id === cardId);
      setMessage(`🃏 ${card?.name} activated! Now choose a pit.`);
      setBoardState(engine.getState());
      playSound('click');

      // If it's a skip turn card, also activate the skip
      if (card?.type === 'skip_turn') {
        engine.activateSkipTurn();
      }
    }
  }, [isAIThinking, activePowerCardId]);

  const animateTurn = async (finalState: CongkakBoardState) => {
    setIsAnimating(true);
    const steps = finalState.sowingAnimation || [];
    
    // We need a visual state that we can mutate
    let visualState: CongkakBoardState = {
      ...boardState!,
      pits: [ [...boardState!.pits[0]], [...boardState!.pits[1]] ],
      stores: [...boardState!.stores],
      energy: [...boardState!.energy],
      combo: [...boardState!.combo],
    };

    // Zero out the starting pit logic
    // We assume the engine already calculated everything correctly.
    // To make the animation look right, we should start from the logic that the "source" pit is empty.
    // However, since handlePitClick doesn't give us the "pre-move" state explicitly cleanly separated from "engine has run"...
    // Actually, `boardState` (UI) is still the OLD state when this function starts!
    // We must manually zero the clicked pit?
    // The engine's `finalState` already has the starting pit processing.
    // `sowSteps` describes the filling.
    // Let's rely on visualState starting from `boardState` (Old) and applying steps.
    // Wait, `sowSteps` contains the Target Pit count.
    
    // First, clear the source pit visually if it was a player move.
    // We can infer the source from the first step? No.
    // Let's just run with the steps. If the source pit isn't cleared immediately, it might look odd.
    // But `steps` only record ADDITIONS usually.
    // Correction: `CongkakEngine` clears the pit in logic.
    // `sowingAnimation` does NOT record the picking up.
    // So we need to manually clear the source pit in `visualState`.
    // We can find the source pit by checking `finalState.lastMove` and `finalState.currentPlayer` (wait, current player might toggle).
    // Better: pass source pit to this function?
    // Simpler: Just snap to "Source Empty" at start of animation?
    // We will just proceed with steps.
    
    // Actually, simpler:
    // Let's snap to `finalState` structure but with Pits/Stores reverted to pre-move? No, hard to reverse.
    // Let's just use `finalState` but "visually" populate slightly differently?
    // No, safest is:
    // 1. Manually set visualState's source pit to 0. (We know it from `finalState.lastMove`? No that's the END pit?)
    // `CongkakEngine` logic: `this.board.lastMove = pitIndex;` (Input pit).
    // So `finalState.lastMove` IS the starting pit.
    // And `finalState.captureHistory` usually tells us who moved? Or `boardState.currentPlayer`.
    // The "mover" is the `currentPlayer` of the OLD state (`boardState`).
    
    if (boardState && finalState.lastMove !== null) {
      visualState.pits[boardState.currentPlayer][finalState.lastMove] = 0;
      setBoardState({ ...visualState });
      await new Promise(r => setTimeout(r, 200));
    }

    for (const step of steps) {
      setActiveAnim({ side: step.side, pit: step.pit });
      
      // Update the specifics
      if (step.isStore) {
        visualState.stores[step.side] = step.seeds;
      } else {
        visualState.pits[step.side][step.pit] = step.seeds;
      }
      
      // If capture, apply visual update for capture
      if (step.isCapture) {
         // Clear the captured pit visually
         const oppSide = 1 - step.side;
         const oppPit = CONGKAK_PITS - 1 - step.pit;
         visualState.pits[oppSide][oppPit] = 0;
         // Also clear own pit (sow count was 1 -> becomes 0 after capture logic)
         visualState.pits[step.side][step.pit] = 0;
         playSound('achievement');
      } else {
         playSound('click'); 
      }

      setBoardState({ ...visualState });
      await new Promise(r => setTimeout(r, 150)); // Speed of animation
    }

    setActiveAnim(null);
    setIsAnimating(false);
    setBoardState(finalState);
  };

  const animateSimultaneous = async (steps1: any[], steps2: any[], startPit1: number, startPit2: number) => {
    setIsAnimating(true);
    
    // Copy Board State
    let visualState: CongkakBoardState = {
      ...boardState!,
      pits: [ [...boardState!.pits[0]], [...boardState!.pits[1]] ],
      stores: [...boardState!.stores],
      energy: [...boardState!.energy],
      combo: [...boardState!.combo],
    };

    // Zero out both starting pits visually
    if (startPit1 >= 0) visualState.pits[0][startPit1] = 0;
    if (startPit2 >= 0) visualState.pits[1][startPit2] = 0;
    
    // Animation Loop (Interleaved)
    const maxSteps = Math.max(steps1.length, steps2.length);
    for (let i = 0; i < maxSteps; i++) {
        const s1 = steps1[i];
        const s2 = steps2[i];

        if (s1) {
            setActiveAnim({ side: s1.side, pit: s1.pit }); // Player highlight priority
            if (s1.isStore) visualState.stores[s1.side] = s1.seeds;
            else visualState.pits[s1.side][s1.pit] = s1.seeds;
            if (s1.isCapture) {
                const oppSide = 1 - s1.side;
                const oppPit = CONGKAK_PITS - 1 - s1.pit;
                visualState.pits[oppSide][oppPit] = 0;
                visualState.pits[s1.side][s1.pit] = 0;
            }
        }
        if (s2) {
            // Update AI visuals (no highlight or secondary highlight if possible)
            // Just update values
            if (s2.isStore) visualState.stores[s2.side] = s2.seeds;
            else visualState.pits[s2.side][s2.pit] = s2.seeds;
             if (s2.isCapture) {
                const oppSide = 1 - s2.side;
                const oppPit = CONGKAK_PITS - 1 - s2.pit;
                visualState.pits[oppSide][oppPit] = 0;
                visualState.pits[s2.side][s2.pit] = 0;
            }
        }

        playSound('click');
        setBoardState({ ...visualState });
        await new Promise(r => setTimeout(r, 150));
    }

    setActiveAnim(null);
    setIsAnimating(false);
  };

  const handlePitClick = async (pitIndex: number) => {
    const engine = engineRef.current;
    if (!engine || isAIThinking || isAnimating) return;

    const state = engine.getState();
    if (state.currentPlayer !== 0) return;

    // --- Simultaneous Start Logic (Turn 1 only) ---
    if (moveCount === 0 && gameMode === 'ai') {
        const ai = aiRef.current;
        
        // 2. Player Move
        const playerMoved = engine.makeMove(pitIndex);
        if (!playerMoved) return;
        const playerState = engine.getState();
        const playerSteps = [...(playerState.sowingAnimation || [])];
        
        // 3. AI Move (Immediately after)
        // Force AI turn by bypassing private modifier
        (engine as any).board.currentPlayer = 1; 
        
        // Check AI Power Card
        if (ai) {
             const card = ai.shouldUsePowerCard(engine);
             if (card) engine.usePowerCard(card);
        }
        
        const aiMove = ai ? ai.getBestMove(engine) : -1;
        let aiSteps: any[] = [];
        if (aiMove >= 0) {
            engine.makeMove(aiMove);
            const aiResultState = engine.getState();
            aiSteps = [...(aiResultState.sowingAnimation || [])];
        } else {
             // Fallback
             (engine as any).board.currentPlayer = 0;
        }
        
        setMoveCount(m => m + 1);
        setActivePowerCardId(null);

        // 4. Animate Both
        const finalState = engine.getState();
        await animateSimultaneous(playerSteps, aiSteps, pitIndex, aiMove);
        
        setBoardState(finalState);
        
        // Check Game Over / Next Turn
        if (engine.isGameOver()) {
             endGame(engine);
             return;
        }
        
        if (finalState.currentPlayer === 1) {
            setMessage('AI gets extra turn...');
            setIsAIThinking(true);
            setTimeout(() => doAIMove(), 800);
        } else {
            setMessage('Your turn!');
        }
        return;
    }
    // --- End Simultaneous Logic ---

    const moved = engine.makeMove(pitIndex);
    if (!moved) return;

    setActivePowerCardId(null);
    setMoveCount(m => m + 1);

    const newState = engine.getState();
    await animateTurn(newState);

    // Capture flash
    if (newState.lastCaptureAmount > 0) {
      setCaptureFlash(true);
      if (typeof window !== 'undefined') new Audio('/sounds/achievement.mp3').play().catch(()=>{});
      setTimeout(() => setCaptureFlash(false), 600);
    }

    if (engine.isGameOver()) {
      endGame(engine);
      return;
    }

    if (newState.currentPlayer === 0) {
      setMessage('🎯 Extra turn! Last seed landed in your store.');
    } else {
      setMessage('AI is thinking...');
      setIsAIThinking(true);
      const delay = difficulty === 'hard' ? 1200 : 600;
      setTimeout(() => doAIMove(), delay);
    }
  };

  const doAIMove = async () => {
    const engine = engineRef.current;
    const ai = aiRef.current;
    if (!engine || !ai) return;

    // AI power card decision
    const cardToUse = ai.shouldUsePowerCard(engine);
    if (cardToUse) {
       engine.usePowerCard(cardToUse);
       setMessage(`🤖 AI uses ${cardToUse.replace('_', ' ')}!`);
       await new Promise(r => setTimeout(r, 800));
    }

    // Small delay before move start
    await new Promise(r => setTimeout(r, 400));

    const move = ai.getBestMove(engine);
    if (move >= 0) {
      engine.makeMove(move);
    }

    const newState = engine.getState();
    await animateTurn(newState);
    
    setIsAIThinking(false);

    if (newState.lastCaptureAmount > 0) {
      setCaptureFlash(true);
      setTimeout(() => setCaptureFlash(false), 600);
    }

    if (engine.isGameOver()) {
      endGame(engine);
      return;
    }

    if (newState.currentPlayer === 1) {
      setMessage('AI gets another turn...');
      setIsAIThinking(true);
      setTimeout(() => doAIMove(), 800);
    } else {
      setMessage('Your turn — choose a pit to sow seeds');
    }
  };

  const endGame = async (engine: CongkakEngine) => {
    setPhase('ended');
    const scores = engine.calculateScore();
    const winnerId = scores['player'] > scores['ai'] ? (userId || 'guest') : (scores['ai'] > scores['player'] ? 'ai' : null);
    const isDraw = scores['player'] === scores['ai'];
    const result: MatchResult = {
      winnerId,
      scores: { [userId || 'guest']: scores['player'], ai: scores['ai'] },
      isDraw,
      xpEarned: 0,
      goldEarned: 0,
      duration: engine.getElapsedTime(),
    };

    if (result.winnerId === (userId || 'guest')) {
      setMessage('🎉 Victory!');
      playSound('win');
    } else if (result.winnerId === 'ai') {
      setMessage('Defeat — AI wins');
      playSound('lose');
    } else {
      setMessage('⚖️ Draw!');
    }

    if (userId) {
      try {
        const response = await submitGameResult('congkak', gameMode, result, userId);
        if (response.success && response.xp !== undefined) {
          setRewards({ xp: response.xp || 0, gold: response.gold || 0 });
        }
      } catch (err) {
        console.error('Failed to submit result:', err);
      }
    }
  };

  // ---- MENU SCREEN ----
  if (phase === 'menu') {
    return (
      <div className="min-h-screen batik-bg p-4 sm:p-8 flex items-center justify-center">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-neon-cyan/3 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg relative z-10"
        >
          <div className="game-card p-8 text-center">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12 }}
              className="mb-6"
            >
              <span className="text-6xl block mb-3">🎯</span>
              <h1 className="text-4xl font-black tracking-tight">
                <span className="gradient-text-gold">CONGKAK</span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-1">Strategy Realm</p>
            </motion.div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-2 mb-8">
              {['Energy System', 'Combo Chains', 'Power Cards', 'AI Battles'].map((feat, i) => (
                <motion.div
                  key={feat}
                  initial={{ opacity: 0, x: i % 2 === 0 ? -15 : 15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-medium text-[var(--text-secondary)]"
                >
                  {feat}
                </motion.div>
              ))}
            </div>

            {/* Play Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setPhase('mode_select')}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white font-black rounded-2xl text-lg tracking-wide shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 transition-all"
            >
              PLAY NOW
            </motion.button>

            <Link href="/realms" className="block mt-5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
              ← Back to Realms
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- MODE SELECT SCREEN ----
  if (phase === 'mode_select') {
    return (
      <div className="min-h-screen batik-bg p-4 sm:p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg relative z-10"
        >
          <div className="game-card p-8">
            <button onClick={() => setPhase('menu')} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-4 flex items-center gap-1 transition-colors">
              ← Back
            </button>

            <h2 className="text-2xl font-bold mb-6">
              <span className="gradient-text-gold">Select Mode</span>
            </h2>

            {/* Mode cards */}
            <div className="space-y-3 mb-8">
              {Object.entries(MODE_INFO).map(([key, info], i) => (
                <motion.button
                  key={key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => setGameMode(key as GameMode)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
                    gameMode === key
                      ? 'bg-primary-600/15 border-primary-500/50 shadow-lg shadow-primary-600/10'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-color)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  <span className="text-2xl w-10 text-center">{info.icon}</span>
                  <div>
                    <p className="font-bold text-sm" style={{ color: gameMode === key ? info.color : undefined }}>{info.label}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{info.desc}</p>
                  </div>
                  {gameMode === key && (
                    <motion.div layoutId="mode-check" className="ml-auto w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center text-xs text-white">✓</motion.div>
                  )}
                </motion.button>
              ))}
            </div>

            {/* AI Difficulty */}
            <h3 className="text-sm font-bold mb-3 text-[var(--text-secondary)]">AI Difficulty</h3>
            <div className="flex gap-3 mb-8">
              {(Object.entries(DIFFICULTY_INFO) as [AIDifficulty, typeof DIFFICULTY_INFO['easy']][]).map(([key, info]) => (
                <button
                  key={key}
                  onClick={() => setDifficulty(key)}
                  className={`flex-1 py-3 px-2 rounded-xl border text-center transition-all ${
                    difficulty === key
                      ? 'border-primary-500/50 bg-primary-600/15'
                      : 'border-[var(--border-color)] bg-[var(--bg-elevated)] hover:border-[var(--text-secondary)]'
                  }`}
                >
                  <div className="text-xs mb-1">
                    {Array.from({ length: info.stars }).map((_, i) => (
                      <span key={i} style={{ color: info.color }}>★</span>
                    ))}
                  </div>
                  <p className="text-xs font-bold" style={{ color: difficulty === key ? info.color : undefined }}>{info.label}</p>
                </button>
              ))}
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startGame}
              className="w-full py-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 text-white font-black rounded-2xl text-lg tracking-wide shadow-lg shadow-orange-600/30 hover:shadow-orange-600/50 transition-all"
            >
              START MATCH
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- GAME SCREEN ----
  return (
    <div className={`min-h-screen batik-bg p-3 sm:p-6 transition-all ${captureFlash ? 'capture-flash' : ''}`}>
      <div className="max-w-5xl mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-xl">🎯</span>
            <div>
              <h1 className="text-lg font-bold leading-tight">Congkak</h1>
              <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                {MODE_INFO[gameMode]?.label || 'AI'} · {DIFFICULTY_INFO[difficulty].label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Move {moveCount}</span>
            <Link href="/realms" className="glass px-3 py-1.5 rounded-xl text-xs hover:bg-white/10 transition-all">
              Exit
            </Link>
          </div>
        </div>

        {/* Status message */}
        <AnimatePresence mode="wait">
          <motion.div
            key={message}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="text-center mb-4"
          >
            <p className={`text-sm font-semibold ${isAIThinking ? 'text-blue-400 animate-pulse' : 'text-primary-400'}`}>
              {message}
            </p>
          </motion.div>
        </AnimatePresence>

        {boardState && (
          <div className="space-y-4">
            {/* AI Info Bar */}
            <div className="game-card p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${boardState.currentPlayer === 1 ? 'bg-blue-400 animate-pulse' : 'bg-[var(--text-secondary)]'}`} />
                  <span className="text-sm font-bold text-blue-400">🤖 AI</span>
                  <ComboDisplay combo={boardState.combo[1]} multiplier={boardState.comboMultiplier[1]} />
                </div>
                <span className="text-xl font-black text-blue-400 tabular-nums">{boardState.stores[1]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)]">⚡</span>
                <EnergyBar value={boardState.energy[1]} max={100} color="#3498db" />
                <span className="text-[10px] text-blue-400 tabular-nums w-6 text-right">{boardState.energy[1]}</span>
              </div>
            </div>

            {/* GAME BOARD */}
            <div className="game-card p-4 sm:p-6 congkak-board-bg">
              <div className="flex items-stretch justify-center gap-3 sm:gap-5">
                {/* Player Store (Left - Order 1) */}
                <div className="congkak-store-modern order-1 flex flex-col items-center justify-center bg-gradient-to-b from-amber-950/60 to-amber-900/30 border-amber-500/30">
                  <span className="text-[10px] text-amber-400/70 mb-1">YOU</span>
                  <motion.span
                    key={`p-s-${boardState.stores[0]}`}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    className={`text-2xl sm:text-3xl font-black text-amber-400 ${activeAnim?.side === 0 && activeAnim?.pit === -1 ? 'neon-text' : ''}`}
                  >
                    {boardState.stores[0]}
                  </motion.span>
                  <div className="relative w-10 h-10 mt-2">
                    {Array.from({ length: Math.min(boardState.stores[0], 15) }).map((_, i) => (
                      <Marble key={i} index={i} total={Math.min(boardState.stores[0], 15)} color="#fbbf24" />
                    ))}
                  </div>
                </div>

                {/* Pit grid */}
                <div className="flex-1 max-w-[520px] order-2 space-y-3 sm:space-y-4">
                  {/* AI pits (Top: Rendered L->R [0..6] to flow into Right Store) */}
                  <div className="flex justify-between gap-1 sm:gap-2">
                    {boardState.pits[1].map((seeds, i) => {
                      const actualIndex = i; // Normal order
                      return (
                        <PitWithMarbles
                          key={`ai-${actualIndex}`}
                          seeds={seeds}
                          color="#60a5fa"
                          isClickable={false}
                          isHighlighted={activeAnim ? (activeAnim.side === 1 && activeAnim.pit === actualIndex) : (boardState.lastMove === actualIndex && boardState.currentPlayer === 0)}
                          label={`AI pit ${actualIndex + 1}: ${seeds} seeds`}
                        />
                      );
                    })}
                  </div>

                  {/* Center divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-[var(--border-color)] to-transparent" />

                  {/* Player pits (Bottom: Rendered R->L [6..0] to flow into Left Store) */}
                  <div className="flex justify-between gap-1 sm:gap-2">
                    {[...boardState.pits[0]].reverse().map((seeds, i) => {
                      // If reversing 7 items [0..6], index 0 of loop is actual index 6.
                      const actualIndex = CONGKAK_PITS - 1 - i;
                      const isClickable = boardState.currentPlayer === 0 && seeds > 0 && phase === 'playing' && !isAIThinking && !isAnimating;
                      return (
                        <PitWithMarbles
                          key={`p-${actualIndex}`}
                          seeds={seeds}
                          color="#fbbf24"
                          isClickable={isClickable}
                          isHighlighted={activeAnim ? (activeAnim.side === 0 && activeAnim.pit === actualIndex) : (boardState.lastMove === actualIndex && boardState.currentPlayer === 1)}
                          onClick={() => handlePitClick(actualIndex)}
                          label={`Your pit ${actualIndex + 1}: ${seeds} seeds`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* AI Store (Right - Order 3) */}
                <div className="congkak-store-modern order-3 flex flex-col items-center justify-center bg-gradient-to-b from-blue-950/60 to-blue-900/30 border-blue-500/30">
                  <span className="text-[10px] text-blue-400/70 mb-1">AI</span>
                  <motion.span
                    key={`ai-s-${boardState.stores[1]}`}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    className={`text-2xl sm:text-3xl font-black text-blue-400 ${activeAnim?.side === 1 && activeAnim?.pit === -1 ? 'neon-text' : ''}`}
                  >
                    {boardState.stores[1]}
                  </motion.span>
                  <div className="relative w-10 h-10 mt-2">
                    {Array.from({ length: Math.min(boardState.stores[1], 15) }).map((_, i) => (
                      <Marble key={i} index={i} total={Math.min(boardState.stores[1], 15)} color="#60a5fa" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Player Info Bar */}
            <div className="game-card p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${boardState.currentPlayer === 0 ? 'bg-amber-400 animate-pulse' : 'bg-[var(--text-secondary)]'}`} />
                  <span className="text-sm font-bold text-amber-400">👤 You</span>
                  <ComboDisplay combo={boardState.combo[0]} multiplier={boardState.comboMultiplier[0]} />
                </div>
                <span className="text-xl font-black text-amber-400 tabular-nums">{boardState.stores[0]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-secondary)]">⚡</span>
                <EnergyBar value={boardState.energy[0]} max={100} color="#f59e0b" />
                <span className="text-[10px] text-amber-400 tabular-nums w-6 text-right">{boardState.energy[0]}</span>
              </div>
            </div>

            {/* Power Cards (only in non-casual mode) */}
            {gameMode !== 'casual' && boardState.powerCards[0].length > 0 && (
              <div className="game-card p-3 sm:p-4">
                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-2 font-bold">Power Cards</p>
                <div className="grid grid-cols-3 gap-2">
                  {boardState.powerCards[0].map(card => (
                    <PowerCardButton
                      key={card.id}
                      card={card}
                      isActive={activePowerCardId === card.id}
                      canAfford={boardState.energy[0] >= card.cost && !card.used && boardState.currentPlayer === 0 && !isAIThinking && !isAnimating}
                      onUse={() => handlePowerCard(card.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Capture History (last 3) */}
            {boardState.captureHistory.length > 0 && (
              <div className="flex gap-2 justify-center">
                {boardState.captureHistory.slice(-3).map((ev, i) => (
                  <motion.div
                    key={`${ev.turn}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[10px] text-[var(--text-secondary)]"
                  >
                    {ev.player === 0 ? '👤' : '🤖'} captured {ev.amount} {ev.comboLevel > 1 && <span className="text-amber-400">(x{ev.comboLevel})</span>}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GAME OVER */}
        {phase === 'ended' && boardState && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="game-card p-8 max-w-md w-full text-center">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                className="text-6xl block mb-4"
              >
                {boardState.stores[0] > boardState.stores[1] ? '🏆' : boardState.stores[0] < boardState.stores[1] ? '💀' : '⚖️'}
              </motion.span>
              <h2 className="text-3xl font-black mb-2 gradient-text-gold">{message}</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6">Game completed in {moveCount} moves</p>

              <div className="flex justify-center gap-10 mb-8">
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">You</p>
                  <p className="text-4xl font-black text-amber-400">{boardState.stores[0]}</p>
                </div>
                <div className="text-2xl font-bold text-[var(--text-secondary)] flex items-center">vs</div>
                <div>
                  <p className="text-xs text-[var(--text-secondary)] mb-1">AI</p>
                  <p className="text-4xl font-black text-blue-400">{boardState.stores[1]}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-8">
                <div className="p-2 rounded-xl bg-[var(--bg-elevated)]">
                  <p className="text-[10px] text-[var(--text-secondary)]">Captures</p>
                  <p className="text-sm font-bold">{boardState.captureHistory.filter(e => e.player === 0).length}</p>
                </div>
                <div className="p-2 rounded-xl bg-[var(--bg-elevated)]">
                  <p className="text-[10px] text-[var(--text-secondary)]">Best Combo</p>
                  <p className="text-sm font-bold">{Math.max(...boardState.captureHistory.filter(e => e.player === 0).map(e => e.comboLevel), 0)}</p>
                </div>
                <div className="p-2 rounded-xl bg-[var(--bg-elevated)]">
                  <p className="text-[10px] text-[var(--text-secondary)]">Cards Used</p>
                  <p className="text-sm font-bold">{boardState.powerCards[0].filter(c => c.used).length}</p>
                </div>
              </div>

              {rewards && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-8 p-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex justify-center gap-6"
                >
                  <div className="text-center">
                    <p className="text-xs text-amber-200 uppercase tracking-widest font-bold">XP Earned</p>
                    <p className="text-2xl font-black text-amber-400">+{rewards.xp}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-yellow-200 uppercase tracking-widest font-bold">Gold Earned</p>
                    <p className="text-2xl font-black text-yellow-400">+{rewards.gold}</p>
                  </div>
                </motion.div>
              )}

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={startGame}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl"
                >
                  Play Again
                </motion.button>
                <Link
                  href="/realms"
                  className="flex-1 py-3 glass rounded-xl font-medium hover:bg-white/10 transition-all text-center"
                >
                  Realms
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
