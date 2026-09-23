'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, ArrowDown, RotateCcw, RotateCw, RefreshCw, Zap } from 'lucide-react';

interface TouchControlsProps {
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onRotateCW: () => void;
  onRotateCCW: () => void;
  onHold: () => void;
  disabled?: boolean;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  onMoveLeft,
  onMoveRight,
  onSoftDrop,
  onHardDrop,
  onRotateCW,
  onRotateCCW,
  onHold,
  disabled = false,
}) => {
  const triggerHaptic = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handleAction = (action: () => void) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    triggerHaptic();
    action();
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-md mx-auto pt-2 pb-1 select-none">
      <div className="flex items-center justify-between gap-3">
        {/* Left Side: Movement D-Pad */}
        <div className="grid grid-cols-3 gap-2">
          <div />
          {/* Hard Drop Button */}
          <button
            onTouchStart={handleAction(onHardDrop)}
            onClick={handleAction(onHardDrop)}
            disabled={disabled}
            className="w-13 h-13 rounded-xl bg-cyan-950/70 border border-cyan-500/40 text-cyan-300 flex flex-col items-center justify-center active:scale-95 active:bg-cyan-500/30 shadow-lg transition-transform"
            aria-label="Hard Drop"
          >
            <Zap className="w-5 h-5 text-cyan-400" />
            <span className="text-[8px] font-bold tracking-tighter">DROP</span>
          </button>
          <div />

          {/* Left Button */}
          <button
            onTouchStart={handleAction(onMoveLeft)}
            onClick={handleAction(onMoveLeft)}
            disabled={disabled}
            className="w-13 h-13 rounded-xl bg-gray-900/80 border border-white/10 text-white flex items-center justify-center active:scale-95 active:bg-white/20 shadow-lg transition-transform"
            aria-label="Move Left"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Soft Drop Button */}
          <button
            onTouchStart={handleAction(onSoftDrop)}
            onClick={handleAction(onSoftDrop)}
            disabled={disabled}
            className="w-13 h-13 rounded-xl bg-gray-900/80 border border-white/10 text-white flex items-center justify-center active:scale-95 active:bg-white/20 shadow-lg transition-transform"
            aria-label="Soft Drop"
          >
            <ArrowDown className="w-6 h-6" />
          </button>

          {/* Right Button */}
          <button
            onTouchStart={handleAction(onMoveRight)}
            onClick={handleAction(onMoveRight)}
            disabled={disabled}
            className="w-13 h-13 rounded-xl bg-gray-900/80 border border-white/10 text-white flex items-center justify-center active:scale-95 active:bg-white/20 shadow-lg transition-transform"
            aria-label="Move Right"
          >
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>

        {/* Center: Hold Button */}
        <div className="flex flex-col items-center justify-center">
          <button
            onTouchStart={handleAction(onHold)}
            onClick={handleAction(onHold)}
            disabled={disabled}
            className="px-3 py-4 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 flex flex-col items-center justify-center active:scale-95 active:bg-purple-500/30 shadow-lg transition-transform"
            aria-label="Hold Piece"
          >
            <RefreshCw className="w-5 h-5 text-purple-400 mb-1" />
            <span className="text-[9px] font-bold tracking-wider">HOLD</span>
          </button>
        </div>

        {/* Right Side: Rotation Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Rotate CCW */}
          <button
            onTouchStart={handleAction(onRotateCCW)}
            onClick={handleAction(onRotateCCW)}
            disabled={disabled}
            className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-500/40 text-amber-300 flex flex-col items-center justify-center active:scale-95 active:bg-amber-500/30 shadow-lg transition-transform"
            aria-label="Rotate Counter-Clockwise"
          >
            <RotateCcw className="w-5 h-5 text-amber-400" />
            <span className="text-[8px] font-bold mt-0.5">CCW</span>
          </button>

          {/* Rotate CW */}
          <button
            onTouchStart={handleAction(onRotateCW)}
            onClick={handleAction(onRotateCW)}
            disabled={disabled}
            className="w-15 h-15 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex flex-col items-center justify-center active:scale-95 active:bg-emerald-500/30 shadow-lg transition-transform"
            aria-label="Rotate Clockwise"
          >
            <RotateCw className="w-6 h-6 text-emerald-400" />
            <span className="text-[9px] font-bold mt-0.5">ROT CW</span>
          </button>
        </div>
      </div>
    </div>
  );
};
