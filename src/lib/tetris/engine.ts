import {
  ActivePiece,
  Board,
  ClearEvent,
  FallingBlock,
  GameMode,
  GameSettings,
  GameStats,
  GameStatus,
  RotationState,
  TetrominoType,
} from './types';
import {
  BOARD_WIDTH,
  BOARD_TOTAL_HEIGHT,
  BOARD_BUFFER_HEIGHT,
  DEFAULT_SETTINGS,
  LEVEL_SPEEDS,
  LOCK_DELAY_MS,
  MAX_LOCK_RESETS,
  TETROMINO_COLORS,
  TETROMINO_SHAPES,
  WALL_KICKS_I,
  WALL_KICKS_JLSTZ,
  LINE_CLEAR_ANIMATION_MS,
  CASCADE_FALL_ANIMATION_MS,
} from './constants';
import { PieceRandomizer } from './randomizer';
import {
  applyGravity,
  checkPerfectClear,
  clearRowsToEmpty,
  createEmptyBoard,
  findFullLines,
} from './gravity';
import { sound } from '../sound/synth';

export interface EngineCallbacks {
  onStateChange?: () => void;
  onClearEvent?: (event: ClearEvent) => void;
  onGameOver?: (stats: GameStats) => void;
  onPieceLocked?: () => void;
  onHardDrop?: (x: number, y: number, color: string) => void;
  onCascadeStep?: (chain: number, fallenCount: number) => void;
}

export class TetrisEngine {
  public board: Board;
  public activePiece: ActivePiece | null = null;
  public holdPiece: TetrominoType | null = null;
  public canHold = true;
  public status: GameStatus = 'idle';
  public mode: GameMode = 'marathon';
  public settings: GameSettings;

  public stats: GameStats;
  public nextPieces: TetrominoType[] = [];

  // Active cascade animation state
  public clearingRows: number[] = [];
  public fallingBlocks: FallingBlock[] = [];
  public cascadeChain = 0;

  private randomizer: PieceRandomizer;
  private dropTimer = 0;
  private lockTimer = 0;
  private isLocking = false;
  private lockResets = 0;
  private lastMoveWasRotate = false;
  private backToBack = false;

  private animationTimer = 0;
  private animationDuration = 0;

  public callbacks: EngineCallbacks = {};

  public setSettings(settings: Partial<GameSettings>): void {
    this.settings = { ...this.settings, ...settings };
  }

  public setMode(mode: GameMode): void {
    this.mode = mode;
  }

  public setOnStateChange(callback: (() => void) | undefined): void {
    this.callbacks.onStateChange = callback;
  }

  public setOnGameOver(callback: ((stats: GameStats) => void) | undefined): void {
    this.callbacks.onGameOver = callback;
  }

  public setOnClearEvent(callback: ((event: ClearEvent) => void) | undefined): void {
    this.callbacks.onClearEvent = callback;
  }

  public setOnHardDrop(callback: ((x: number, y: number, color: string) => void) | undefined): void {
    this.callbacks.onHardDrop = callback;
  }

  constructor(settings: Partial<GameSettings> = {}, mode: GameMode = 'marathon') {
    this.settings = { ...DEFAULT_SETTINGS, ...settings };
    this.mode = mode;
    this.board = createEmptyBoard();
    this.randomizer = new PieceRandomizer();
    this.stats = this.createInitialStats();
    this.nextPieces = this.randomizer.peek(5);
  }

  private createInitialStats(): GameStats {
    return {
      score: 0,
      lines: 0,
      level: 1,
      combo: 0,
      maxCombo: 0,
      cascadeChain: 0,
      maxCascadeChain: 0,
      piecesPlaced: 0,
      tSpins: 0,
      tetrisCount: 0,
      singleCount: 0,
      doubleCount: 0,
      tripleCount: 0,
      perfectClears: 0,
      startTime: Date.now(),
      elapsedTime: 0,
    };
  }

  public start(): void {
    this.board = createEmptyBoard();
    this.randomizer.reset();
    this.holdPiece = null;
    this.canHold = true;
    this.status = 'playing';
    this.stats = this.createInitialStats();
    this.stats.startTime = Date.now();
    this.clearingRows = [];
    this.fallingBlocks = [];
    this.cascadeChain = 0;
    this.backToBack = false;
    this.nextPieces = this.randomizer.peek(5);

    this.spawnPiece();
    if (this.settings.musicEnabled) {
      sound.startBGM();
    }
    this.notify();
  }

  private previousStatus: GameStatus = 'playing';

  public pause(): void {
    if (this.status === 'playing' || this.status === 'clearing' || this.status === 'cascading') {
      this.previousStatus = this.status;
      this.status = 'paused';
      sound.pauseBGM();
      this.notify();
    }
  }

  public resume(): void {
    if (this.status === 'paused') {
      this.status = this.previousStatus || 'playing';
      if (this.settings.musicEnabled) {
        sound.resumeBGM();
      }
      this.notify();
    }
  }

  public restart(): void {
    this.start();
  }

  private spawnPiece(type?: TetrominoType): boolean {
    const pieceType = type || this.randomizer.next();
    this.nextPieces = this.randomizer.peek(5);

    // Initial spawn coordinates (centered in buffer rows)
    const initialX = pieceType === 'O' ? 4 : 3;
    const initialY = pieceType === 'I' ? 2 : 2;

    const piece: ActivePiece = {
      type: pieceType,
      rotation: 0,
      x: initialX,
      y: initialY,
    };

    const pieceMatrix = this.getPieceMatrix(piece.type, piece.rotation);
    if (this.checkCollision(piece.x, piece.y, pieceMatrix)) {
      // Immediate block out = Game Over
      this.triggerGameOver();
      return false;
    }

    this.activePiece = piece;
    this.isLocking = false;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.lastMoveWasRotate = false;
    return true;
  }

  private getPieceMatrix(type: TetrominoType, rotation: RotationState): number[][] {
    return TETROMINO_SHAPES[type][rotation];
  }

  private get activeShape(): number[][] {
    if (!this.activePiece) return [];
    return this.getPieceMatrix(this.activePiece.type, this.activePiece.rotation);
  }

  // Helper getter for collision detection
  public checkCollision(
    x: number,
    y: number,
    shape: number[][],
    board: Board = this.board
  ): boolean {
    const rows = shape.length;
    const cols = shape[0].length;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c] !== 0) {
          const boardX = x + c;
          const boardY = y + r;

          // Wall and floor boundaries
          if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_TOTAL_HEIGHT) {
            return true;
          }

          // Ceilings (allow in buffer area, but not negative y)
          if (boardY < 0) {
            return true;
          }

          // Check if board already occupied
          if (board[boardY][boardX] && board[boardY][boardX]?.filled) {
            return true;
          }
        }
      }
    }
    return false;
  }

  // --- Active Piece Movement ---

  public moveLeft(): boolean {
    if (this.status !== 'playing' || !this.activePiece) return false;
    if (!this.checkCollision(this.activePiece.x - 1, this.activePiece.y, this.activeShape)) {
      this.activePiece.x -= 1;
      this.lastMoveWasRotate = false;
      this.onPieceMoved();
      sound.playMove();
      this.notify();
      return true;
    }
    return false;
  }

  public moveRight(): boolean {
    if (this.status !== 'playing' || !this.activePiece) return false;
    if (!this.checkCollision(this.activePiece.x + 1, this.activePiece.y, this.activeShape)) {
      this.activePiece.x += 1;
      this.lastMoveWasRotate = false;
      this.onPieceMoved();
      sound.playMove();
      this.notify();
      return true;
    }
    return false;
  }

  public softDrop(): boolean {
    if (this.status !== 'playing' || !this.activePiece) return false;
    if (!this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activeShape)) {
      this.activePiece.y += 1;
      this.stats.score += 1; // 1 point per soft drop cell
      this.lastMoveWasRotate = false;
      sound.playSoftDrop();
      this.notify();
      return true;
    } else {
      // Piece is touching floor/block
      this.isLocking = true;
      return false;
    }
  }

  public hardDrop(): void {
    if (this.status !== 'playing' || !this.activePiece) return;

    let dropDistance = 0;
    while (!this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activeShape)) {
      this.activePiece.y += 1;
      dropDistance++;
    }

    this.stats.score += dropDistance * 2; // 2 points per hard drop cell
    sound.playHardDrop();

    const color = TETROMINO_COLORS[this.activePiece.type].primary;
    if (this.callbacks.onHardDrop) {
      this.callbacks.onHardDrop(this.activePiece.x, this.activePiece.y, color);
    }

    this.lockActivePiece();
  }

  public rotate(clockwise: boolean = true): boolean {
    if (this.status !== 'playing' || !this.activePiece) return false;
    if (this.activePiece.type === 'O') return false; // O piece doesn't rotate

    const currentRotation = this.activePiece.rotation;
    const newRotation = ((currentRotation + (clockwise ? 1 : 3)) % 4) as RotationState;
    const newShape = this.getPieceMatrix(this.activePiece.type, newRotation);

    const kickKey = `${currentRotation}-${newRotation}`;
    const kicks =
      this.activePiece.type === 'I'
        ? WALL_KICKS_I[kickKey] || [[0, 0]]
        : WALL_KICKS_JLSTZ[kickKey] || [[0, 0]];

    for (const [dx, dy] of kicks) {
      if (!this.checkCollision(this.activePiece.x + dx, this.activePiece.y + dy, newShape)) {
        this.activePiece.x += dx;
        this.activePiece.y += dy;
        this.activePiece.rotation = newRotation;
        this.lastMoveWasRotate = true;
        this.onPieceMoved();
        sound.playRotate();
        this.notify();
        return true;
      }
    }
    return false;
  }

  public rotate180(): boolean {
    if (this.status !== 'playing' || !this.activePiece) return false;
    if (this.activePiece.type === 'O') return false;

    const currentRotation = this.activePiece.rotation;
    const newRotation = ((currentRotation + 2) % 4) as RotationState;
    const newShape = this.getPieceMatrix(this.activePiece.type, newRotation);

    if (!this.checkCollision(this.activePiece.x, this.activePiece.y, newShape)) {
      this.activePiece.rotation = newRotation;
      this.lastMoveWasRotate = true;
      this.onPieceMoved();
      sound.playRotate();
      this.notify();
      return true;
    }
    return false;
  }

  public hold(): boolean {
    if (this.status !== 'playing' || !this.activePiece || !this.canHold) return false;

    const currentType = this.activePiece.type;
    sound.playHold();

    if (this.holdPiece === null) {
      this.holdPiece = currentType;
      this.spawnPiece();
    } else {
      const temp = this.holdPiece;
      this.holdPiece = currentType;
      this.spawnPiece(temp);
    }

    this.canHold = false;
    this.notify();
    return true;
  }

  private onPieceMoved(): void {
    if (!this.activePiece) return;
    const isTouchingSurfaceBelow = this.checkCollision(
      this.activePiece.x,
      this.activePiece.y + 1,
      this.activeShape
    );

    if (!isTouchingSurfaceBelow) {
      // In mid-air: not grounded, cannot lock or glue from the side!
      this.isLocking = false;
      this.lockTimer = 0;
    } else {
      // Touching floor or locked block underneath
      if (this.isLocking) {
        if (this.lockResets < MAX_LOCK_RESETS) {
          this.lockTimer = 0;
          this.lockResets++;
        }
      } else {
        this.isLocking = true;
        this.lockTimer = 0;
      }
    }
  }

  // --- Ghost Piece Projection ---

  public getGhostY(): number {
    if (!this.activePiece) return 0;
    let ghostY = this.activePiece.y;
    while (!this.checkCollision(this.activePiece.x, ghostY + 1, this.activeShape)) {
      ghostY++;
    }
    return ghostY;
  }

  // --- Lock Piece & Line Clear / Cascade Cycle ---

  private lockActivePiece(): void {
    if (!this.activePiece) return;

    // Safety guard: a piece can NEVER lock in mid-air!
    // A piece can ONLY lock if resting on the bottom floor or on a block underneath it
    if (!this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activeShape)) {
      this.isLocking = false;
      this.lockTimer = 0;
      return;
    }

    const shape = this.activeShape;
    const colorInfo = TETROMINO_COLORS[this.activePiece.type];
    const isT = this.activePiece.type === 'T';
    let isTSpin = false;
    const isTSpinMini = false;

    // Detect T-Spin if applicable
    if (isT && this.lastMoveWasRotate) {
      const corners = [
        { x: this.activePiece.x, y: this.activePiece.y },
        { x: this.activePiece.x + 2, y: this.activePiece.y },
        { x: this.activePiece.x, y: this.activePiece.y + 2 },
        { x: this.activePiece.x + 2, y: this.activePiece.y + 2 },
      ];

      let occupiedCorners = 0;
      for (const pt of corners) {
        if (
          pt.x < 0 ||
          pt.x >= BOARD_WIDTH ||
          pt.y >= BOARD_TOTAL_HEIGHT ||
          (pt.y >= 0 && this.board[pt.y][pt.x]?.filled)
        ) {
          occupiedCorners++;
        }
      }

      if (occupiedCorners >= 3) {
        isTSpin = true;
      }
    }

    // Write piece to board
    let lockedAboveBuffer = true;
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] !== 0) {
          const boardX = this.activePiece.x + c;
          const boardY = this.activePiece.y + r;
          if (boardY >= BOARD_BUFFER_HEIGHT) {
            lockedAboveBuffer = false;
          }
          if (boardY >= 0 && boardY < BOARD_TOTAL_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
            const cellId = `cell-${boardX}-${boardY}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
            this.board[boardY][boardX] = {
              filled: true,
              color: colorInfo.primary,
              glowColor: colorInfo.glow,
              type: this.activePiece.type,
              id: cellId,
            };
          }
        }
      }
    }

    sound.playLock();
    this.stats.piecesPlaced++;
    this.canHold = true;
    this.activePiece = null;

    if (this.callbacks.onPieceLocked) {
      this.callbacks.onPieceLocked();
    }

    if (lockedAboveBuffer) {
      // Locked completely above the visible board
      this.triggerGameOver();
      return;
    }

    // Check for initial line clear
    const fullRows = findFullLines(this.board);

    if (fullRows.length > 0) {
      this.cascadeChain = 1;
      this.startLineClear(fullRows, isTSpin, isTSpinMini);
    } else {
      this.stats.combo = 0;
      this.cascadeChain = 0;
      this.checkModeObjectives();
      this.spawnPiece();
      this.notify();
    }
  }

  // --- Cascade Gravity Chain Reaction Loop ---

  private startLineClear(rows: number[], isTSpin: boolean = false, isTSpinMini: boolean = false): void {
    this.status = 'clearing';
    this.clearingRows = rows;
    this.animationTimer = 0;
    this.animationDuration = LINE_CLEAR_ANIMATION_MS;

    const lines = rows.length;
    this.stats.combo++;
    if (this.stats.combo > this.stats.maxCombo) {
      this.stats.maxCombo = this.stats.combo;
    }

    if (lines === 1) this.stats.singleCount++;
    else if (lines === 2) this.stats.doubleCount++;
    else if (lines === 3) this.stats.tripleCount++;
    else if (lines === 4) this.stats.tetrisCount++;

    const isTetris = lines === 4;
    const isDifficult = isTetris || isTSpin;
    const isB2B = isDifficult && this.backToBack;
    if (isDifficult) {
      this.backToBack = true;
    } else if (lines > 0) {
      this.backToBack = false;
    }

    // Calculate score
    let baseScore = 0;
    if (isTSpin) {
      this.stats.tSpins++;
      if (lines === 1) baseScore = 800;
      else if (lines === 2) baseScore = 1200;
      else if (lines === 3) baseScore = 1600;
      else baseScore = 400;
    } else {
      if (lines === 1) baseScore = 100;
      else if (lines === 2) baseScore = 300;
      else if (lines === 3) baseScore = 500;
      else if (lines === 4) baseScore = 800;
    }

    if (isB2B) {
      baseScore = Math.floor(baseScore * 1.5);
    }

    // Cascade bonus multiplier: increases with chain!
    const cascadeMultiplier = this.cascadeChain > 1 ? this.cascadeChain * 1.5 : 1;
    const comboBonus = Math.max(0, (this.stats.combo - 1) * 50 * this.stats.level);
    const scoreAwarded = Math.floor(baseScore * this.stats.level * cascadeMultiplier) + comboBonus;

    this.stats.score += scoreAwarded;
    this.stats.lines += lines;

    // Check level progression (5 lines per level for faster progression)
    const newLevel = Math.min(20, Math.floor(this.stats.lines / 5) + 1);
    if (newLevel > this.stats.level) {
      this.stats.level = newLevel;
      sound.playLevelUp();
    }

    if (this.cascadeChain > this.stats.maxCascadeChain) {
      this.stats.maxCascadeChain = this.cascadeChain;
    }

    // Play appropriate audio
    if (this.cascadeChain > 1) {
      sound.playCascade(this.cascadeChain);
    } else {
      sound.playClear(lines);
    }

    // Emit clear event
    const event: ClearEvent = {
      linesCleared: lines,
      rows,
      cascadeStep: this.cascadeChain,
      scoreAwarded,
      isTSpin,
      isTSpinMini,
      isTetris,
      isBackToBack: isB2B,
      isPerfectClear: false,
      combo: this.stats.combo,
      label: this.getClearLabel(lines, isTSpin, isB2B, this.cascadeChain),
    };

    if (this.callbacks.onClearEvent) {
      this.callbacks.onClearEvent(event);
    }

    this.notify();
  }

  private getClearLabel(
    lines: number,
    isTSpin: boolean,
    isB2B: boolean,
    cascadeStep: number
  ): string {
    let str = '';
    if (isB2B) str += 'B2B ';
    if (isTSpin) str += 'T-SPIN ';

    if (lines === 1) str += 'SINGLE';
    else if (lines === 2) str += 'DOUBLE';
    else if (lines === 3) str += 'TRIPLE';
    else if (lines === 4) str += 'TETRIS!';

    if (cascadeStep > 1) {
      str += ` • CASCADE x${cascadeStep}!`;
    }
    return str;
  }

  private triggerCascadeGravity(): void {
    // 1. Remove the full cleared lines (leaves empty rows)
    const boardWithGaps = clearRowsToEmpty(this.board, this.clearingRows);
    this.clearingRows = [];

    // 2. Apply cascade gravity: in-air bricks fall down!
    const { newBoard, fallenBlocks, hasFallen } = applyGravity(
      boardWithGaps,
      this.settings.gravityMode
    );

    if (hasFallen && fallenBlocks.length > 0) {
      this.status = 'cascading';
      this.fallingBlocks = fallenBlocks;
      this.board = newBoard; // Board is updated
      this.animationTimer = 0;
      this.animationDuration = CASCADE_FALL_ANIMATION_MS;

      if (this.callbacks.onCascadeStep) {
        this.callbacks.onCascadeStep(this.cascadeChain, fallenBlocks.length);
      }
    } else {
      // No blocks needed to fall (or finished falling)
      this.board = newBoard;
      this.fallingBlocks = [];
      this.afterCascadeSettled();
    }
    this.notify();
  }

  private afterCascadeSettled(): void {
    this.fallingBlocks = [];

    // Check for Perfect Clear
    if (checkPerfectClear(this.board)) {
      this.stats.perfectClears++;
      const pcScore = 3000 * this.stats.level;
      this.stats.score += pcScore;
      sound.playTetris();

      if (this.callbacks.onClearEvent) {
        this.callbacks.onClearEvent({
          linesCleared: 0,
          rows: [],
          cascadeStep: this.cascadeChain,
          scoreAwarded: pcScore,
          isTSpin: false,
          isTSpinMini: false,
          isTetris: false,
          isBackToBack: false,
          isPerfectClear: true,
          combo: this.stats.combo,
          label: 'PERFECT CLEAR! (+3,000)',
        });
      }
    }

    // Check if new lines formed after bricks fell!
    const newFullRows = findFullLines(this.board);

    if (newFullRows.length > 0) {
      // CASCADE CHAIN REACTION!
      this.cascadeChain++;
      this.startLineClear(newFullRows, false, false);
    } else {
      // Cascade sequence finished! Return to normal play
      this.cascadeChain = 0;
      this.status = 'playing';
      this.checkModeObjectives();
      this.spawnPiece();
      this.notify();
    }
  }

  private checkModeObjectives(): void {
    if (this.mode === 'sprint' && this.stats.lines >= 40) {
      this.triggerGameOver(true);
    }
  }

  private triggerGameOver(victory: boolean = false): void {
    this.status = 'gameover';
    this.activePiece = null;
    sound.stopBGM();
    if (!victory) {
      sound.playGameOver();
    } else {
      sound.playTetris();
    }
    if (this.callbacks.onGameOver) {
      this.callbacks.onGameOver(this.stats);
    }
    this.notify();
  }

  // --- Main Game Loop Update (invoked per frame with delta ms) ---

  public update(deltaMs: number): void {
    if (this.status === 'gameover' || this.status === 'paused' || this.status === 'idle') {
      return;
    }

    this.stats.elapsedTime += deltaMs;

    // Ultra mode 2-minute timer limit
    if (this.mode === 'ultra' && this.stats.elapsedTime >= 120000) {
      this.triggerGameOver(true);
      return;
    }

    // Handle line clear dissolution animation
    if (this.status === 'clearing') {
      this.animationTimer += deltaMs;
      if (this.animationTimer >= this.animationDuration) {
        this.triggerCascadeGravity();
      }
      this.notify();
      return;
    }

    // Handle cascade falling animation
    if (this.status === 'cascading') {
      this.animationTimer += deltaMs;
      const progress = Math.min(1, this.animationTimer / this.animationDuration);
      for (const block of this.fallingBlocks) {
        block.progress = progress;
      }

      if (this.animationTimer >= this.animationDuration) {
        this.afterCascadeSettled();
      }
      this.notify();
      return;
    }

    if (this.status !== 'playing' || !this.activePiece) return;

    // Normal piece falling
    const currentSpeed = LEVEL_SPEEDS[Math.min(this.stats.level - 1, LEVEL_SPEEDS.length - 1)];
    this.dropTimer += deltaMs;

    if (this.dropTimer >= currentSpeed) {
      this.dropTimer = 0;
      if (!this.checkCollision(this.activePiece.x, this.activePiece.y + 1, this.activeShape)) {
        this.activePiece.y += 1;
        this.isLocking = false;
        this.notify();
      } else {
        this.isLocking = true;
      }
    }

    // Lock delay countdown
    if (this.isLocking) {
      this.lockTimer += deltaMs;
      if (this.lockTimer >= LOCK_DELAY_MS) {
        this.lockActivePiece();
      }
    }
  }

  private notify(): void {
    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange();
    }
  }
}
