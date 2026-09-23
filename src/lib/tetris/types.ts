export type TetrominoType = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';

export type RotationState = 0 | 1 | 2 | 3;

export interface Cell {
  filled: boolean;
  color: string;
  glowColor: string;
  type: TetrominoType;
  id?: string;
  flash?: boolean;
}

export type Board = (Cell | null)[][];

export interface ActivePiece {
  type: TetrominoType;
  rotation: RotationState;
  x: number;
  y: number;
}

export type GameStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'clearing'
  | 'cascading'
  | 'gameover';

export type GameMode = 'marathon' | 'sprint' | 'ultra' | 'zen';

export type GravityMode = 'cascade' | 'connected';

export interface FallingBlock {
  fromY: number;
  toY: number;
  x: number;
  cell: Cell;
  progress: number; // 0 to 1 for smooth animation
}

export interface ClearEvent {
  linesCleared: number;
  rows: number[];
  cascadeStep: number;
  scoreAwarded: number;
  isTSpin: boolean;
  isTSpinMini: boolean;
  isTetris: boolean;
  isBackToBack: boolean;
  isPerfectClear: boolean;
  combo: number;
  label?: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape?: 'square' | 'circle' | 'spark';
}

export interface FloatingText {
  id: string;
  text: string;
  subtext?: string;
  x: number;
  y: number;
  color: string;
  scale: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  combo: number;
  maxCombo: number;
  cascadeChain: number;
  maxCascadeChain: number;
  piecesPlaced: number;
  tSpins: number;
  tetrisCount: number;
  singleCount: number;
  doubleCount: number;
  tripleCount: number;
  perfectClears: number;
  startTime: number;
  elapsedTime: number;
}

export interface HighScoreEntry {
  id: string;
  playerName: string;
  score: number;
  lines: number;
  level: number;
  mode: GameMode;
  maxCascade: number;
  date: string;
}

export interface GameSettings {
  gravityMode: GravityMode;
  ghostPiece: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  sfxVolume: number;
  musicVolume: number;
  screenShake: boolean;
  crtEffect: boolean;
  particlesEnabled: boolean;
  das: number; // Delayed Auto Shift (ms)
  arr: number; // Auto Repeat Rate (ms)
}
