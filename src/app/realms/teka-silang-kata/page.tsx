'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TekaSilangKataEngine } from '@/game-engine/realms/teka-silang-kata/TekaSilangKataEngine';
import { CROSSWORD_LEVELS } from '@/game-engine/realms/teka-silang-kata/levels';
import { TekaSilangKataState, CrosswordLevel } from '@/types';
import { cn, formatDuration, playSound } from '@/lib/utils';
import { SOUNDS } from '@/lib/constants';

export default function TekaSilangKataPage() {
  const [level, setLevel] = useState<CrosswordLevel | null>(null);
  const [gameState, setGameState] = useState<TekaSilangKataState | null>(null);
  const engineRef = useRef<TekaSilangKataEngine | null>(null);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);

  // Initialize engine when level changes
  useEffect(() => {
    if (level) {
      const engine = new TekaSilangKataEngine();
      engine.initialize({
        mode: 'solo',
        players: [{ id: 'player1', username: 'Pemain', score: 0, isAI: false, isActive: true }],
        settings: { levelId: level.id }
      });
      engineRef.current = engine;
      setGameState(engine.getState() as TekaSilangKataState);

      const timer = setInterval(() => {
        if (engine && !engine.isGameOver()) {
          engine.update(1);
          setGameState({ ...engine.getState() as TekaSilangKataState });
        } else if (engine.isGameOver()) {
          clearInterval(timer);
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [level]);

  const handleCellClick = (r: number, c: number) => {
    // Only allow clicking cells that are part of a word
    const isWordCell = level?.words.some(w => {
      const isAcross = w.direction === 'across' && r === w.row && c >= w.col && c < w.col + w.length;
      const isDown = w.direction === 'down' && c === w.col && r >= w.row && r < w.row + w.length;
      return isAcross || isDown;
    });

    if (isWordCell) {
      setSelectedCell({ r, c });
      playSound(SOUNDS.click);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedCell || !engineRef.current || gameState?.isGameOver) return;

    if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
      engineRef.current.updateCell(selectedCell.r, selectedCell.c, e.key);
      setGameState({ ...engineRef.current.getState() as TekaSilangKataState });
      playSound(SOUNDS.move);
      
      // Auto move to next cell (naive)
      // Find direction based on currently highlighted word if possible
    } else if (e.key === 'Backspace') {
      engineRef.current.updateCell(selectedCell.r, selectedCell.c, '');
      setGameState({ ...engineRef.current.getState() as TekaSilangKataState });
    }
  };

  if (!level) {
    return (
      <div className="min-h-screen batik-bg flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-3xl max-w-2xl w-full border border-purple-500/30"
        >
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold gradient-text mb-2">Teka Silang Kata</h1>
            <p className="text-[var(--text-secondary)]">Pilih tahap cabaran anda</p>
          </div>

          <div className="grid gap-4">
            {CROSSWORD_LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l)}
                className="flex items-center justify-between p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500 hover:bg-purple-500/10 transition-all group"
              >
                <div className="text-left">
                  <h3 className="text-xl font-bold group-hover:text-purple-400 transition-colors">{l.name}</h3>
                  <p className="text-sm text-[var(--text-secondary)]">Tahap: {l.difficulty} • {l.words.length} Perkataan</p>
                </div>
                <div className="px-4 py-2 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-semibold">
                  Mula →
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  const currentHints = level.words.filter(w => !gameState?.completedWords.includes(w.id));

  return (
    <div className="min-h-screen batik-bg p-4 md:p-8 flex flex-col items-center" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Sidebar / Stats */}
        <div className="space-y-6">
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="glass p-6 rounded-2xl border border-purple-500/20"
          >
            <div className="flex items-center gap-4 mb-6">
              <button 
                onClick={() => setLevel(null)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                📜
              </button>
              <div>
                <h2 className="text-xl font-bold">{level.name}</h2>
                <p className="text-xs text-purple-400 uppercase tracking-widest">{level.difficulty}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                  🕒 Masa
                </div>
                <div className="text-xl font-mono font-bold text-amber-400">
                  {formatDuration(Math.floor(gameState?.timeLeft || 0))}
                </div>
              </div>
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs mb-1">
                  🏆 Skor
                </div>
                <div className="text-xl font-mono font-bold text-green-400">
                  {gameState?.score || 0}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hint Card */}
          <motion.div 
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass p-6 rounded-2xl border border-purple-500/20 flex-1 h-[400px] overflow-hidden flex flex-col"
          >
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              🧠 Pembayang
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {level.words.map((w) => (
                <div 
                  key={w.id} 
                  className={cn(
                    "p-3 rounded-xl border transition-all",
                    gameState?.completedWords.includes(w.id) 
                      ? "bg-green-500/10 border-green-500/30 opacity-60" 
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-tighter text-purple-400">
                      {w.direction} • {w.length} Huruf
                    </span>
                    {gameState?.completedWords.includes(w.id) && (
                      <span className="text-[10px] text-green-400 font-bold uppercase">Selesai</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed">{w.hint}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Game Grid */}
        <div className="lg:col-span-2 flex flex-col items-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="p-4 bg-black/40 rounded-3xl border border-purple-500/20 shadow-2xl backdrop-blur-xl"
          >
            <div 
              className="grid gap-1 bg-white/5 p-2 rounded-xl"
              style={{ 
                gridTemplateColumns: `repeat(${level.size}, minmax(0, 1fr))`,
                width: 'min(90vw, 600px)',
                aspectRatio: '1/1'
              }}
            >
              {Array(level.size).fill(null).map((_, r) => (
                Array(level.size).fill(null).map((_, c) => {
                  const isCellPartOfWord = level.words.some(w => {
                    const isAcross = w.direction === 'across' && r === w.row && c >= w.col && c < w.col + w.length;
                    const isDown = w.direction === 'down' && c === w.col && r >= w.row && r < w.row + w.length;
                    return isAcross || isDown;
                  });

                  const isSelected = selectedCell?.r === r && selectedCell?.c === c;
                  const value = gameState?.grid[r][c] || '';

                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => handleCellClick(r, c)}
                      className={cn(
                        "relative flex items-center justify-center rounded-md text-sm sm:text-lg font-bold transition-all cursor-pointer",
                        !isCellPartOfWord ? "opacity-0 pointer-events-none" : "bg-white/10 border border-white/5",
                        isSelected && "ring-2 ring-purple-500 bg-purple-500/20",
                        value && !isSelected && "bg-purple-500/10"
                      )}
                    >
                      {value}
                      
                      {/* Grid number (start of word) */}
                      {level.words.find(w => w.row === r && w.col === c) && (
                        <span className="absolute top-0.5 left-0.5 text-[8px] text-[var(--text-secondary)]">
                          {level.words.findIndex(w => w.row === r && w.col === c) + 1}
                        </span>
                      )}
                    </div>
                  );
                })
              ))}
            </div>
          </motion.div>

          <div className="mt-8 text-center text-[var(--text-secondary)] text-sm">
            <kbd className="px-2 py-1 rounded bg-white/10 border border-white/20 text-xs">A-Z</kbd> untuk menaip • 
            <kbd className="ml-2 px-2 py-1 rounded bg-white/10 border border-white/20 text-xs">BACKSPACE</kbd> untuk padam
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      <AnimatePresence>
        {gameState?.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass p-10 rounded-3xl border border-purple-500 w-full max-w-md text-center"
            >
              <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🏆</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">Permainan Tamat!</h2>
              <p className="text-[var(--text-secondary)] mb-8">
                Anda telah menyelesaikan {gameState.completedWords.length} perkataan dalam level ini.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">Skor Akhir</div>
                  <div className="text-2xl font-bold text-purple-400">{gameState.score}</div>
                </div>
                <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                  <div className="text-xs text-[var(--text-secondary)] mb-1">EXP Dijana</div>
                  <div className="text-2xl font-bold text-amber-500">
                    +{gameState.completedWords.length * 5 + (gameState.completedWords.length === level.words.length ? 50 : 0)}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => setLevel(null)}
                  className="w-full py-4 rounded-2xl bg-purple-600 hover:bg-purple-500 font-bold transition-colors"
                >
                  Kembali ke Menu
                </button>
                <button 
                  onClick={() => {
                    const l = level;
                    setLevel(null);
                    setTimeout(() => setLevel(l), 10);
                  }}
                  className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 font-bold transition-colors"
                >
                  Main Semula
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
