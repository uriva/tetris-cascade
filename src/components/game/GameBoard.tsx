'use client';

import React, { useEffect, useRef } from 'react';
import { TetrisEngine } from '@/lib/tetris/engine';
import { GameRenderer } from '@/lib/tetris/renderer';
import { ClearEvent } from '@/lib/tetris/types';

interface GameBoardProps {
  engine: TetrisEngine;
  onClearEvent?: (event: ClearEvent) => void;
  onPauseToggle?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  engine,
  onClearEvent,
  onPauseToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Key state tracking for DAS / ARR
  const keysDownRef = useRef<Map<string, number>>(new Map());
  const dasTimerRef = useRef<number | null>(null);
  const arrIntervalRef = useRef<number | null>(null);

  // Touch gesture tracking on canvas
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  // Initialize renderer and callbacks
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new GameRenderer(canvasRef.current);
    rendererRef.current = renderer;

    const handleResize = () => {
      renderer.updateDimensions();
    };

    window.addEventListener('resize', handleResize);

    // Attach engine callbacks for visual effects
    engine.setOnClearEvent((event: ClearEvent) => {
      if (onClearEvent) onClearEvent(event);

      // Line clear particles
      if (event.rows.length > 0) {
        renderer.spawnLineClearParticles(event.rows);
      }

      // Screen shake only on major clears (Tetris / Triple)
      if (event.isTetris) {
        renderer.triggerScreenShake(8);
      } else if (event.linesCleared >= 3) {
        renderer.triggerScreenShake(4);
      }

      // Cascade sparkles and subtle shake on high cascades
      if (event.cascadeStep >= 3) {
        renderer.spawnCascadeSparkles(event.cascadeStep);
        renderer.triggerScreenShake(5);
      } else if (event.cascadeStep > 1) {
        renderer.spawnCascadeSparkles(event.cascadeStep);
      }

      // Floating text banner
      if (event.label) {
        let color = '#00e5ff';
        if (event.isTetris) color = '#ffd700';
        else if (event.cascadeStep > 1) color = '#c084fc';
        else if (event.isTSpin) color = '#f43f5e';

        renderer.addFloatingText(
          event.label,
          `+${event.scoreAwarded.toLocaleString()} PTS`,
          color
        );
      }
    });

    engine.setOnHardDrop((x: number, y: number, color: string) => {
      renderer.spawnHardDropParticles(x, y, color);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.setOnClearEvent(undefined);
      engine.setOnHardDrop(undefined);
    };
  }, [engine, onClearEvent]);

  // Main Game Animation Loop
  useEffect(() => {
    lastTimeRef.current = performance.now();

    const loop = (time: number) => {
      const delta = Math.min(100, time - lastTimeRef.current);
      lastTimeRef.current = time;

      engine.update(delta);

      if (rendererRef.current) {
        rendererRef.current.render(engine, delta);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [engine]);

  // Keyboard input handlers with DAS/ARR
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent scrolling for game controls
      if (
        ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(
          e.code
        )
      ) {
        e.preventDefault();
      }

      if (keysDownRef.current.has(e.code)) return; // Ignore auto-repeat from OS
      keysDownRef.current.set(e.code, performance.now());

      if (e.code === 'KeyP' || e.code === 'Escape') {
        if (onPauseToggle) onPauseToggle();
        return;
      }

      if (engine.status !== 'playing') {
        if ((e.code === 'Space' || e.code === 'Enter') && engine.status === 'gameover') {
          engine.start();
        }
        return;
      }

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          engine.moveLeft();
          startDAS('left');
          break;
        case 'ArrowRight':
        case 'KeyD':
          engine.moveRight();
          startDAS('right');
          break;
        case 'ArrowDown':
        case 'KeyS':
          engine.softDrop();
          startDAS('down');
          break;
        case 'Space':
          engine.hardDrop();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX':
          engine.rotate(true);
          break;
        case 'KeyZ':
          engine.rotate(false);
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          engine.hold();
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.code);

      const hasLeft =
        keysDownRef.current.has('ArrowLeft') || keysDownRef.current.has('KeyA');
      const hasRight =
        keysDownRef.current.has('ArrowRight') || keysDownRef.current.has('KeyD');
      const hasDown =
        keysDownRef.current.has('ArrowDown') || keysDownRef.current.has('KeyS');

      if (!hasLeft && !hasRight && !hasDown) {
        stopDAS();
      } else if (hasLeft) {
        startDAS('left');
      } else if (hasRight) {
        startDAS('right');
      } else if (hasDown) {
        startDAS('down');
      }
    };

    const startDAS = (dir: 'left' | 'right' | 'down') => {
      stopDAS();
      const dasTime = dir === 'down' ? 60 : engine.settings.das;
      const arrTime = dir === 'down' ? 30 : engine.settings.arr;

      dasTimerRef.current = window.setTimeout(() => {
        arrIntervalRef.current = window.setInterval(() => {
          if (dir === 'left') engine.moveLeft();
          else if (dir === 'right') engine.moveRight();
          else if (dir === 'down') engine.softDrop();
        }, arrTime);
      }, dasTime);
    };

    const stopDAS = () => {
      if (dasTimerRef.current !== null) {
        clearTimeout(dasTimerRef.current);
        dasTimerRef.current = null;
      }
      if (arrIntervalRef.current !== null) {
        clearInterval(arrIntervalRef.current);
        arrIntervalRef.current = null;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopDAS();
    };
  }, [engine, onPauseToggle]);

  // Touch Swipe Gestures on Canvas
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length !== 1) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!touchStartRef.current) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - touchStartRef.current.x;
    const dy = endY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 15 && absDy < 15 && dt < 250) {
      // Tap -> Rotate CW
      engine.rotate(true);
    } else if (absDy > absDx && dy > 50 && dt < 300) {
      // Swipe down -> Hard Drop
      engine.hardDrop();
    } else if (absDx > absDy && absDx > 30) {
      // Swipe Left / Right
      if (dx > 0) engine.moveRight();
      else engine.moveLeft();
    }

    touchStartRef.current = null;
  };

  return (
    <div className="relative flex items-center justify-center p-2 rounded-2xl arcade-panel arcade-panel-cyan shadow-2xl">
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="w-[260px] h-[520px] sm:w-[300px] sm:h-[600px] rounded-xl block cursor-pointer touch-none"
      />

      {/* Paused Overlay */}
      {engine.status === 'paused' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="text-3xl font-extrabold font-mono text-cyan-400 text-glow-cyan tracking-widest animate-pulse">
            PAUSED
          </div>
          <p className="text-xs text-white/50 tracking-wider">PRESS P OR ESC TO RESUME</p>
        </div>
      )}
    </div>
  );
};
