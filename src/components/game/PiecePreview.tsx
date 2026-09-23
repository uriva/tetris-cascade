'use client';

import React from 'react';
import { TetrominoType } from '@/lib/tetris/types';
import { TETROMINO_COLORS, TETROMINO_SHAPES } from '@/lib/tetris/constants';

interface PiecePreviewProps {
  type: TetrominoType | null;
  size?: number; // Size of individual cell in px
  disabled?: boolean;
}

export const PiecePreview: React.FC<PiecePreviewProps> = ({
  type,
  size = 18,
  disabled = false,
}) => {
  if (!type) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-white/5 bg-black/30"
        style={{ width: size * 4 + 16, height: size * 3 + 16 }}
      >
        <span className="text-xs text-white/20 font-mono tracking-widest">— EMPTY —</span>
      </div>
    );
  }

  const matrix = TETROMINO_SHAPES[type][0];
  const colorInfo = TETROMINO_COLORS[type];
  const rows = matrix.length;
  const cols = matrix[0].length;

  return (
    <div
      className={`flex items-center justify-center p-2 rounded-lg border border-white/10 bg-black/40 transition-opacity ${
        disabled ? 'opacity-40 grayscale' : 'opacity-100'
      }`}
      style={{
        width: size * 4 + 16,
        height: (type === 'I' ? 2 : type === 'O' ? 2 : 3) * size + 20,
      }}
    >
      <div
        className="grid gap-[2px]"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${size}px)`,
          gridTemplateRows: `repeat(${rows}, ${size}px)`,
        }}
      >
        {matrix.map((row, r) =>
          row.map((cell, c) => {
            if (cell === 0) {
              return <div key={`${r}-${c}`} style={{ width: size, height: size }} />;
            }
            return (
              <div
                key={`${r}-${c}`}
                className="relative rounded-[3px] border"
                style={{
                  width: size,
                  height: size,
                  background: `linear-gradient(135deg, ${colorInfo.primary}, ${colorInfo.secondary})`,
                  borderColor: colorInfo.border,
                  boxShadow: `0 0 6px ${colorInfo.glow}`,
                }}
              >
                {/* Specular glint */}
                <div className="absolute top-[1px] left-[1px] right-[2px] h-[3px] bg-white/40 rounded-t-[2px]" />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
