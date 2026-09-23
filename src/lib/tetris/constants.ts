import { TetrominoType, RotationState, GameSettings } from './types';

export const BOARD_WIDTH = 10;
export const BOARD_VISIBLE_HEIGHT = 20;
export const BOARD_BUFFER_HEIGHT = 4;
export const BOARD_TOTAL_HEIGHT = BOARD_VISIBLE_HEIGHT + BOARD_BUFFER_HEIGHT; // 24

// Default cell size in pixels for canvas calculations
export const DEFAULT_CELL_SIZE = 30;

export interface PieceColorInfo {
  primary: string;
  secondary: string;
  glow: string;
  border: string;
  highlight: string;
}

export const TETROMINO_COLORS: Record<TetrominoType, PieceColorInfo> = {
  I: {
    primary: '#00e5ff',
    secondary: '#0099cc',
    glow: 'rgba(0, 229, 255, 0.7)',
    border: '#a5f3fc',
    highlight: '#e0f7fa',
  },
  J: {
    primary: '#3b82f6',
    secondary: '#1d4ed8',
    glow: 'rgba(59, 130, 246, 0.7)',
    border: '#93c5fd',
    highlight: '#dbeafe',
  },
  L: {
    primary: '#ff8800',
    secondary: '#c2410c',
    glow: 'rgba(255, 136, 0, 0.7)',
    border: '#fdba74',
    highlight: '#ffedd5',
  },
  O: {
    primary: '#ffd700',
    secondary: '#b59a00',
    glow: 'rgba(255, 215, 0, 0.7)',
    border: '#fde047',
    highlight: '#fef9c3',
  },
  S: {
    primary: '#10b981',
    secondary: '#047857',
    glow: 'rgba(16, 185, 129, 0.7)',
    border: '#6ee7b7',
    highlight: '#d1fae5',
  },
  T: {
    primary: '#c084fc',
    secondary: '#7e22ce',
    glow: 'rgba(192, 132, 252, 0.7)',
    border: '#e9d5ff',
    highlight: '#faf5ff',
  },
  Z: {
    primary: '#f43f5e',
    secondary: '#be123c',
    glow: 'rgba(244, 63, 94, 0.7)',
    border: '#fda4af',
    highlight: '#ffe4e6',
  },
};

// 4x4 or 3x3 matrices for standard tetrominoes
export const TETROMINO_SHAPES: Record<TetrominoType, Record<RotationState, number[][]>> = {
  I: {
    0: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    1: [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    2: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    3: [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  },
  J: {
    0: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    3: [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
  L: {
    0: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    3: [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  },
  O: {
    0: [
      [1, 1],
      [1, 1],
    ],
    1: [
      [1, 1],
      [1, 1],
    ],
    2: [
      [1, 1],
      [1, 1],
    ],
    3: [
      [1, 1],
      [1, 1],
    ],
  },
  S: {
    0: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    2: [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    3: [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  T: {
    0: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    3: [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  Z: {
    0: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    1: [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    2: [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    3: [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  },
};

// SRS Wall Kick Offsets for J, L, S, T, Z pieces
// Format: [fromState_toState]: [ [dx, dy], ... ]
// Note: In standard SRS y is positive upwards. Here we adapt dy for screen coords (downwards is positive)
export const WALL_KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0-1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1-0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1-2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2-1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2-3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3-2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3-0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0-3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

// SRS Wall Kick Offsets for I piece
export const WALL_KICKS_I: Record<string, [number, number][]> = {
  '0-1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1-0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1-2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2-1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2-3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3-2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3-0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0-3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

// Gravity drop intervals by level (in milliseconds)
export const LEVEL_SPEEDS: number[] = [
  800, // Level 1
  710, // Level 2
  620, // Level 3
  530, // Level 4
  440, // Level 5
  360, // Level 6
  280, // Level 7
  210, // Level 8
  150, // Level 9
  105, // Level 10
  80,  // Level 11
  60,  // Level 12
  45,  // Level 13
  35,  // Level 14
  25,  // Level 15+
];

export const LOCK_DELAY_MS = 500;
export const MAX_LOCK_RESETS = 15;
export const LINE_CLEAR_ANIMATION_MS = 180;
export const CASCADE_FALL_ANIMATION_MS = 220;

export const DEFAULT_SETTINGS: GameSettings = {
  gravityMode: 'cascade',
  ghostPiece: true,
  soundEnabled: true,
  musicEnabled: false,
  sfxVolume: 0.7,
  musicVolume: 0.4,
  screenShake: false,
  crtEffect: false,
  particlesEnabled: true,
  das: 130, // ms initial delay
  arr: 28,  // ms repeat rate
};
