'use client';

import React, { useState, useEffect } from 'react';
import { GameStats } from '@/lib/tetris/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameOverModalProps {
  open: boolean;
  stats: GameStats;
  highScore: number;
  onPlayAgain: () => void;
  onSaveScore: (name: string) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  open,
  stats,
  highScore,
  onPlayAgain,
  onSaveScore,
}) => {
  const [playerName, setPlayerName] = useState('PLAYER 1');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const currentKey = `${stats.startTime}-${stats.score}`;
  const saved = savedKey === currentKey;
  const isNewHighScore = stats.score > highScore && stats.score > 0;

  useEffect(() => {
    if (open && isNewHighScore) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00e5ff', '#ffd700', '#ff8800', '#c084fc'],
      });
    }
  }, [open, isNewHighScore]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!saved && playerName.trim()) {
      onSaveScore(playerName.trim().slice(0, 12));
      setSavedKey(currentKey);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md bg-[#0a0d14]/95 border border-white/10 text-white backdrop-blur-2xl shadow-2xl p-6">
        <DialogHeader className="text-center">
          <DialogTitle className="text-3xl font-extrabold font-mono tracking-wider text-rose-500 text-glow-rose">
            GAME OVER
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50 uppercase tracking-widest mt-1">
            Session Performance Summary
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Score Display */}
          <div className="arcade-panel arcade-panel-cyan p-4 rounded-xl text-center">
            {isNewHighScore && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold mb-2 animate-pulse">
                <Trophy className="w-3.5 h-3.5" />
                NEW HIGH SCORE!
              </div>
            )}
            <div className="text-xs text-white/60 uppercase tracking-widest">FINAL SCORE</div>
            <div className="text-4xl font-extrabold font-mono text-cyan-300 text-glow-cyan tracking-tight my-1">
              {stats.score.toLocaleString()}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="arcade-panel p-2 rounded-lg">
              <div className="text-white/50 text-[10px]">LINES</div>
              <div className="text-lg font-bold text-white font-mono">{stats.lines}</div>
            </div>
            <div className="arcade-panel p-2 rounded-lg">
              <div className="text-white/50 text-[10px]">LEVEL</div>
              <div className="text-lg font-bold text-white font-mono">{stats.level}</div>
            </div>
            <div className="arcade-panel p-2 rounded-lg">
              <div className="text-purple-400 text-[10px] flex items-center justify-center gap-0.5">
                <Flame className="w-3 h-3" />
                CASCADE
              </div>
              <div className="text-lg font-bold text-purple-400 font-mono">
                {stats.maxCascadeChain > 1 ? `x${stats.maxCascadeChain}` : '—'}
              </div>
            </div>

            <div className="arcade-panel p-2 rounded-lg">
              <div className="text-white/50 text-[10px]">TETRISES</div>
              <div className="text-base font-bold text-cyan-400 font-mono">{stats.tetrisCount}</div>
            </div>
            <div className="arcade-panel p-2 rounded-lg">
              <div className="text-white/50 text-[10px]">T-SPINS</div>
              <div className="text-base font-bold text-amber-400 font-mono">{stats.tSpins}</div>
            </div>
            <div className="arcade-panel p-2 rounded-lg">
              <div className="text-white/50 text-[10px]">MAX COMBO</div>
              <div className="text-base font-bold text-emerald-400 font-mono">{stats.maxCombo}</div>
            </div>
          </div>

          {/* Save High Score Form */}
          {!saved ? (
            <form onSubmit={handleSave} className="flex gap-2 mt-1">
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value.toUpperCase())}
                maxLength={12}
                placeholder="YOUR NAME"
                className="flex-1 px-3 py-2 rounded-lg bg-black/50 border border-white/20 text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-cyan-400"
              />
              <Button
                type="submit"
                className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold font-mono tracking-wider px-4"
              >
                SAVE
              </Button>
            </form>
          ) : (
            <div className="text-center text-xs font-mono text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 py-2 rounded-lg">
              ✓ Score saved to leaderboard!
            </div>
          )}

          {/* Play Again Button */}
          <Button
            onClick={onPlayAgain}
            className="w-full mt-2 py-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold font-mono tracking-widest text-base shadow-xl flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            PLAY AGAIN (SPACE)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
