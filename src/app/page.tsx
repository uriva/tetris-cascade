'use client';

import React, { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { TetrisEngine } from '@/lib/tetris/engine';
import { GameBoard } from '@/components/game/GameBoard';
import { GameHUD } from '@/components/game/GameHUD';
import { PiecePreview } from '@/components/game/PiecePreview';
import { TouchControls } from '@/components/game/TouchControls';
import { SettingsModal } from '@/components/game/SettingsModal';
import { GameOverModal } from '@/components/game/GameOverModal';
import { LeaderboardModal } from '@/components/game/LeaderboardModal';
import {
  GameMode,
  GameSettings,
  HighScoreEntry,
} from '@/lib/tetris/types';
import { DEFAULT_SETTINGS } from '@/lib/tetris/constants';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Trophy,
  Volume2,
  VolumeX,
  Music,
  RotateCcw,
  Play,
  Pause,
  Flame,
  Layers,
} from 'lucide-react';
import { sound } from '@/lib/sound/synth';

const HIGH_SCORE_KEY = 'tetris_cascade_high_score';
const LEADERBOARD_KEY = 'tetris_cascade_leaderboard';
const SETTINGS_KEY = 'tetris_cascade_settings';

export default function TetrisGamePage() {
  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const [mode, setMode] = useState<GameMode>('marathon');
  const [settings, setSettings] = useState<GameSettings>(() => {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [highScore, setHighScore] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    try {
      const saved = localStorage.getItem(HIGH_SCORE_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [leaderboard, setLeaderboard] = useState<HighScoreEntry[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(LEADERBOARD_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals state
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [gameOverOpen, setGameOverOpen] = useState(false);

  // Engine instance initialized once in state
  const [engine] = useState(() => new TetrisEngine(settings, 'marathon'));

  const [, setTick] = useState(0);

  // Attach engine callbacks and lifecycle
  useEffect(() => {
    engine.setOnStateChange(() => {
      setTick(t => t + 1);
    });

    engine.setOnGameOver(() => {
      setGameOverOpen(true);
      setTick(t => t + 1);
    });

    // Auto start game
    engine.start();

    // Unlock browser audio policy on first user gesture
    const unlockAudio = () => {
      sound.initContext();
      if (engine.settings.musicEnabled) {
        sound.startBGM();
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      sound.stopBGM();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      engine.setOnStateChange(undefined);
      engine.setOnGameOver(undefined);
    };
  }, [engine]);

  // Update engine when mode changes
  const handleModeChange = (newMode: GameMode) => {
    setMode(newMode);
    engine.setMode(newMode);
    engine.start();
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    engine.setSettings(updated);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {}
  };

  // Save High Score & Leaderboard
  const handleSaveScore = (playerName: string) => {
    const newEntry: HighScoreEntry = {
      id: `score-${Date.now()}`,
      playerName,
      score: engine.stats.score,
      lines: engine.stats.lines,
      level: engine.stats.level,
      mode: engine.mode,
      maxCascade: engine.stats.maxCascadeChain,
      date: new Date().toLocaleDateString(),
    };

    const updatedLB = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    setLeaderboard(updatedLB);
    if (engine.stats.score > highScore) {
      setHighScore(engine.stats.score);
      try {
        localStorage.setItem(HIGH_SCORE_KEY, engine.stats.score.toString());
      } catch {}
    }

    try {
      localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updatedLB));
    } catch {}
  };

  const handleClearLeaderboard = () => {
    setLeaderboard([]);
    try {
      localStorage.removeItem(LEADERBOARD_KEY);
    } catch {}
  };

  const handleRestart = () => {
    setGameOverOpen(false);
    engine.start();
  };

  const togglePause = useCallback(() => {
    if (
      engine.status === 'playing' ||
      engine.status === 'clearing' ||
      engine.status === 'cascading'
    ) {
      engine.pause();
    } else if (engine.status === 'paused') {
      engine.resume();
    }
  }, [engine]);

  // Auto-pause game and music on tab loss of focus or visibility change
  useEffect(() => {
    const handlePauseOnUnfocus = () => {
      if (
        engine.status === 'playing' ||
        engine.status === 'clearing' ||
        engine.status === 'cascading'
      ) {
        engine.pause();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handlePauseOnUnfocus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handlePauseOnUnfocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handlePauseOnUnfocus);
    };
  }, [engine]);

  if (!isClient) {
    return <div className="min-h-screen bg-[#07090e]" />;
  }

  return (
    <main className="relative min-h-screen flex flex-col justify-between items-center px-3 py-3 sm:py-6 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,229,255,0.12),rgba(255,255,255,0))] pointer-events-none" />
      {settings.crtEffect && <div className="absolute inset-0 scanlines z-40 pointer-events-none" />}

      {/* Top Navbar */}
      <header className="relative z-10 w-full max-w-5xl flex items-center justify-between gap-2 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Flame className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black font-mono tracking-wider text-white flex items-center gap-1.5">
              TETRIS <span className="text-cyan-400 text-glow-cyan">CASCADE</span>
            </h1>
            <p className="text-[9px] sm:text-[10px] text-white/50 tracking-widest font-mono">
              IN-AIR BRICK GRAVITY // CHAIN REACTIONS
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          {/* Quick Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            title="Toggle Sound FX"
          >
            {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-white/30" />}
          </Button>

          {/* Quick Music Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextState = !settings.musicEnabled;
              handleUpdateSettings({ musicEnabled: nextState });
              sound.initContext();
              if (nextState) {
                sound.startBGM();
              } else {
                sound.stopBGM();
              }
            }}
            className={`h-8 px-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-mono font-bold ${
              settings.musicEnabled
                ? 'bg-purple-950/60 border border-purple-500/40 text-purple-300 shadow-md shadow-purple-500/20'
                : 'text-white/40 hover:text-white/70 hover:bg-white/10'
            }`}
            title="Toggle Retro Synth BGM"
          >
            <Music className={`w-3.5 h-3.5 ${settings.musicEnabled ? 'text-purple-400 animate-pulse' : 'text-white/40'}`} />
            <span className="hidden sm:inline text-[10px]">{settings.musicEnabled ? 'BGM ON' : 'BGM OFF'}</span>
          </Button>

          {/* Leaderboard Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLeaderboardOpen(true)}
            className="w-8 h-8 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-950/40"
            title="Hall of Fame"
          >
            <Trophy className="w-4 h-4" />
          </Button>

          {/* Settings Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            className="w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/10"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>

          {/* Restart Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestart}
            className="h-8 px-2.5 rounded-lg border-cyan-500/30 bg-cyan-950/30 text-cyan-300 hover:bg-cyan-500/20 text-xs font-mono font-bold"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            RESET
          </Button>
        </div>
      </header>

      {/* Mode Switcher Tabs */}
      <div className="relative z-10 flex items-center justify-center gap-1.5 my-2 w-full max-w-md">
        {(['marathon', 'sprint', 'ultra', 'zen'] as GameMode[]).map(m => (
          <button
            key={m}
            onClick={() => handleModeChange(m)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-mono font-bold tracking-wider uppercase transition-all ${
              mode === m
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/30'
                : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Main Playfield Layout */}
      <div className="relative z-10 w-full max-w-5xl flex flex-col md:flex-row items-center md:items-start justify-center gap-4 my-auto">
        {/* Left Column: HOLD & Quick Info */}
        <div className="w-full md:w-52 flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 order-2 md:order-1">
          {/* Hold Piece Container */}
          <div className="arcade-panel p-3 rounded-2xl flex flex-col items-center">
            <span className="text-[10px] tracking-widest text-white/50 font-bold uppercase mb-1.5">
              HOLD (C)
            </span>
            <PiecePreview type={engine.holdPiece} disabled={!engine.canHold} size={20} />
          </div>

          {/* Gravity Mechanic Highlight */}
          <div className="arcade-panel arcade-panel-cyan p-3 rounded-2xl hidden md:flex flex-col items-center text-center max-w-[190px]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300 uppercase mb-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              {settings.gravityMode === 'individual' ? 'Free Fall Sand' : 'Connected Cascade'}
            </div>
            <p className="text-[11px] text-white/60 leading-snug">
              Bricks only fall when unsupported from below or side!
            </p>
          </div>

          {/* Quick Pause Button for desktop */}
          <Button
            variant="outline"
            size="sm"
            onClick={togglePause}
            className="w-full hidden md:flex items-center justify-center gap-1.5 h-9 rounded-xl border-white/10 bg-black/40 text-white/80 hover:text-white"
          >
            {engine.status === 'paused' ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4 text-amber-400" />}
            {engine.status === 'paused' ? 'RESUME (P)' : 'PAUSE (P)'}
          </Button>
        </div>

        {/* Center Column: The Matrix (Game Board) */}
        <div className="flex flex-col items-center order-1 md:order-2">
          <GameBoard
            engine={engine}
            onPauseToggle={togglePause}
          />
        </div>

        {/* Right Column: NEXT QUEUE & HUD */}
        <div className="w-full md:w-64 flex flex-col gap-3 order-3">
          {/* Next Pieces Queue */}
          <div className="arcade-panel p-3 rounded-2xl flex md:flex-col items-center justify-between md:justify-start gap-2">
            <span className="text-[10px] tracking-widest text-white/50 font-bold uppercase">
              NEXT
            </span>
            <div className="flex md:flex-col gap-1.5">
              {engine.nextPieces.slice(0, 3).map((type, i) => (
                <PiecePreview key={i} type={type} size={i === 0 ? 16 : 13} />
              ))}
            </div>
          </div>

          {/* HUD Stats */}
          <GameHUD
            stats={engine.stats}
            mode={mode}
            highScore={highScore}
          />
        </div>
      </div>

      {/* Mobile Touch Controller (Visible on touch devices / smaller screens) */}
      <div className="relative z-20 w-full block md:hidden mt-2">
        <TouchControls
          onMoveLeft={() => engine.moveLeft()}
          onMoveRight={() => engine.moveRight()}
          onSoftDrop={() => engine.softDrop()}
          onHardDrop={() => engine.hardDrop()}
          onRotateCW={() => engine.rotate(true)}
          onRotateCCW={() => engine.rotate(false)}
          onHold={() => engine.hold()}
          disabled={engine.status !== 'playing'}
        />
      </div>

      {/* Footer Info */}
      <footer className="relative z-10 w-full max-w-5xl flex items-center justify-between text-[11px] font-mono text-white/40 pt-3 border-t border-white/5 mt-2">
        <div className="hidden sm:flex items-center gap-3">
          <span>Keyboard: <strong className="text-white/70">Arrows / Space / C</strong></span>
          <span>•</span>
          <span>Mouse: <strong className="text-white/70">Move to Steer • Left Click: Rotate • Right Click: Drop</strong></span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>CASCADE ENGINE v1.0 // ACTIVE</span>
        </div>
      </footer>

      {/* Dialog Modals */}
      <SettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
      />

      <GameOverModal
        open={gameOverOpen}
        stats={engine.stats}
        highScore={highScore}
        onPlayAgain={handleRestart}
        onSaveScore={handleSaveScore}
      />

      <LeaderboardModal
        open={leaderboardOpen}
        onOpenChange={setLeaderboardOpen}
        entries={leaderboard}
        onClear={handleClearLeaderboard}
      />
    </main>
  );
}
