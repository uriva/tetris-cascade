'use client';

import React from 'react';
import { GameMode, GameStats } from '@/lib/tetris/types';
import { Flame, Zap, Trophy, Timer, Layers } from 'lucide-react';

interface GameHUDProps {
  stats: GameStats;
  mode: GameMode;
  highScore: number;
}

export const GameHUD: React.FC<GameHUDProps> = ({ stats, mode, highScore }) => {
  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    const tenths = Math.floor((ms % 1000) / 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
  };

  const getTimerDisplay = () => {
    if (mode === 'ultra') {
      const remaining = Math.max(0, 120000 - stats.elapsedTime);
      return { label: 'TIME LEFT', value: formatTime(remaining) };
    }
    return { label: 'ELAPSED', value: formatTime(stats.elapsedTime) };
  };

  const timerInfo = getTimerDisplay();

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Top Banner: Score & High Score */}
      <div className="arcade-panel arcade-panel-cyan p-3 rounded-xl flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-widest text-cyan-400 font-bold uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            Current Score
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-white text-glow-cyan">
            {stats.score.toLocaleString()}
          </div>
        </div>

        <div className="text-right border-l border-white/10 pl-4">
          <div className="text-[10px] tracking-widest text-amber-400 font-bold uppercase flex items-center justify-end gap-1">
            <Trophy className="w-3 h-3 text-amber-400" />
            High Score
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono text-amber-300">
            {Math.max(highScore, stats.score).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Stats Grid: Level, Lines, Time, Cascade Chain */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="arcade-panel p-2.5 rounded-lg text-center">
          <div className="text-[10px] tracking-wider text-white/50 uppercase font-semibold">LEVEL</div>
          <div className="text-xl font-bold text-cyan-300 font-mono">{stats.level}</div>
        </div>

        <div className="arcade-panel p-2.5 rounded-lg text-center">
          <div className="text-[10px] tracking-wider text-white/50 uppercase font-semibold">
            {mode === 'sprint' ? 'LINES LEFT' : 'LINES'}
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono">
            {mode === 'sprint' ? Math.max(0, 40 - stats.lines) : stats.lines}
          </div>
        </div>

        <div className="arcade-panel p-2.5 rounded-lg text-center">
          <div className="text-[10px] tracking-wider text-white/50 uppercase font-semibold flex items-center justify-center gap-1">
            <Timer className="w-3 h-3 text-white/40" />
            {timerInfo.label}
          </div>
          <div className="text-sm sm:text-base font-bold text-white font-mono mt-0.5">
            {timerInfo.value}
          </div>
        </div>

        <div className="arcade-panel p-2.5 rounded-lg text-center">
          <div className="text-[10px] tracking-wider text-purple-300 uppercase font-semibold flex items-center justify-center gap-1">
            <Layers className="w-3 h-3 text-purple-400" />
            MAX CASCADE
          </div>
          <div className="text-xl font-bold text-purple-400 font-mono">
            {stats.maxCascadeChain > 1 ? `x${stats.maxCascadeChain}` : '—'}
          </div>
        </div>
      </div>

      {/* Active Cascade Banner if cascading */}
      {stats.cascadeChain > 1 && (
        <div className="arcade-panel arcade-panel-amber p-2.5 rounded-xl flex items-center justify-center gap-2 animate-bounce bg-amber-950/40">
          <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          <span className="text-sm sm:text-base font-bold text-amber-300 text-glow-amber tracking-wider">
            CASCADE CHAIN x{stats.cascadeChain}!
          </span>
        </div>
      )}
    </div>
  );
};
