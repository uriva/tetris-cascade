import {
  ActivePiece,
  Cell,
  FloatingText,
  Particle,
} from './types';
import {
  BOARD_WIDTH,
  BOARD_VISIBLE_HEIGHT,
  BOARD_BUFFER_HEIGHT,
  TETROMINO_COLORS,
  TETROMINO_SHAPES,
} from './constants';
import { TetrisEngine } from './engine';

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cellSize: number = 30;
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;
  private textCounter: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Canvas 2D context not available');
    }
    this.ctx = context;
    this.updateDimensions();
  }

  public updateDimensions(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = rect.width || 300;
    const height = rect.height || 600;

    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.resetTransform?.();
    this.ctx.scale(dpr, dpr);

    this.cellSize = width / BOARD_WIDTH;
  }

  public triggerScreenShake(intensity: number): void {
    this.shakeIntensity = Math.min(24, Math.max(this.shakeIntensity, intensity));
  }

  public addParticle(particle: Particle): void {
    this.particles.push(particle);
  }

  public addFloatingText(
    text: string,
    subtext?: string,
    color: string = '#00f5ff',
    x?: number,
    y?: number
  ): void {
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);

    this.floatingTexts.push({
      id: `text-${++this.textCounter}`,
      text,
      subtext,
      x: x !== undefined ? x : canvasWidth / 2,
      y: y !== undefined ? y : canvasHeight * 0.45,
      color,
      scale: 0.5,
      alpha: 1,
      life: 0,
      maxLife: 1000,
    });
  }

  public spawnHardDropParticles(x: number, y: number, color: string): void {
    const visibleY = y - BOARD_BUFFER_HEIGHT;
    const pixelX = (x + 1.5) * this.cellSize;
    const pixelY = (visibleY + 2) * this.cellSize;

    for (let i = 0; i < 20; i++) {
      const angle = (Math.random() * Math.PI) + Math.PI; // Upwards fan
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x: pixelX + (Math.random() - 0.5) * this.cellSize * 2,
        y: pixelY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 0,
        maxLife: 350 + Math.random() * 150,
        shape: 'spark',
      });
    }
  }

  public spawnLineClearParticles(rows: number[]): void {
    for (const r of rows) {
      const visibleY = r - BOARD_BUFFER_HEIGHT;
      if (visibleY < 0) continue;

      const yPos = (visibleY + 0.5) * this.cellSize;
      for (let i = 0; i < 35; i++) {
        const xPos = Math.random() * this.canvas.width / (window.devicePixelRatio || 1);
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1;
        const hue = Math.floor(Math.random() * 360);

        this.particles.push({
          x: xPos,
          y: yPos,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.5,
          size: Math.random() * 5 + 2,
          color: `hsl(${hue}, 90%, 65%)`,
          alpha: 1,
          life: 0,
          maxLife: 450 + Math.random() * 250,
          shape: 'square',
        });
      }
    }
  }

  public spawnCascadeSparkles(chain: number): void {
    const count = chain * 15;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5 - 1,
        size: Math.random() * 4 + 2,
        color: '#ffd700',
        alpha: 1,
        life: 0,
        maxLife: 500 + Math.random() * 300,
        shape: 'spark',
      });
    }
  }

  public render(engine: TetrisEngine, deltaMs: number): void {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    // Apply Screen Shake
    ctx.save();
    let shakeOffsetX = 0;
    let shakeOffsetY = 0;
    if (this.shakeIntensity > 0.5 && engine.settings.screenShake) {
      shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
      shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
      ctx.translate(shakeOffsetX, shakeOffsetY);
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    // 1. Draw Background
    this.drawBackground(w, h);

    // 2. Draw Grid Lines
    this.drawGrid(w, h);

    // 3. Draw Settled Board Cells (or falling animation)
    this.drawBoard(engine);

    // 4. Draw Ghost Piece
    if (engine.settings.ghostPiece && engine.activePiece && engine.status === 'playing') {
      this.drawGhostPiece(engine.activePiece, engine.getGhostY());
    }

    // 5. Draw Active Piece
    if (engine.activePiece && engine.status === 'playing') {
      this.drawActivePiece(engine.activePiece);
    }

    // 6. Draw Line Clear Flash
    if (engine.status === 'clearing' && engine.clearingRows.length > 0) {
      this.drawLineClearFlash(engine.clearingRows, w);
    }

    // 7. Update & Draw Particles
    if (engine.settings.particlesEnabled) {
      this.updateAndDrawParticles(deltaMs);
    }

    // 8. Update & Draw Floating Texts
    this.updateAndDrawFloatingTexts(deltaMs);

    // 9. CRT Scanline overlay (if enabled in settings)
    if (engine.settings.crtEffect) {
      this.drawCRTOverlay(w, h);
    }

    ctx.restore();
  }

  private drawBackground(w: number, h: number): void {
    const ctx = this.ctx;
    // Deep obsidian space with subtle gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0d14');
    grad.addColorStop(0.5, '#07090e');
    grad.addColorStop(1, '#05060a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private drawGrid(w: number, h: number): void {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    // Vertical columns
    for (let x = 0; x <= BOARD_WIDTH; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, h);
      ctx.stroke();
    }

    // Horizontal rows
    for (let y = 0; y <= BOARD_VISIBLE_HEIGHT; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(w, y * this.cellSize);
      ctx.stroke();
    }
  }

  private drawBoard(engine: TetrisEngine): void {
    const isCascading = engine.status === 'cascading' && engine.fallingBlocks.length > 0;
    const fallingMap = new Set<string>();

    if (isCascading) {
      for (const fb of engine.fallingBlocks) {
        fallingMap.add(`${fb.x},${fb.toY}`);
      }
    }

    // Draw static settled cells
    for (let y = BOARD_BUFFER_HEIGHT; y < engine.board.length; y++) {
      const visibleY = y - BOARD_BUFFER_HEIGHT;
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = engine.board[y][x];
        if (cell && cell.filled) {
          if (isCascading && fallingMap.has(`${x},${y}`)) {
            continue; // Will be drawn as falling block
          }
          this.drawCell(x, visibleY, cell);
        }
      }
    }

    // Draw animated falling blocks during cascade
    if (isCascading) {
      for (const fb of engine.fallingBlocks) {
        const fromVisibleY = fb.fromY - BOARD_BUFFER_HEIGHT;
        const toVisibleY = fb.toY - BOARD_BUFFER_HEIGHT;

        // Smooth cubic ease-out
        const t = fb.progress;
        const ease = 1 - Math.pow(1 - t, 3);
        const currentY = fromVisibleY + (toVisibleY - fromVisibleY) * ease;

        if (currentY >= 0) {
          this.drawCell(fb.x, currentY, fb.cell, true);
        }
      }
    }
  }

  private drawActivePiece(piece: ActivePiece): void {
    const shape = TETROMINO_SHAPES[piece.type][piece.rotation];
    const colorInfo = TETROMINO_COLORS[piece.type];

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] !== 0) {
          const boardX = piece.x + c;
          const visibleY = piece.y + r - BOARD_BUFFER_HEIGHT;
          if (visibleY >= 0) {
            this.drawCell(boardX, visibleY, {
              filled: true,
              color: colorInfo.primary,
              glowColor: colorInfo.glow,
              type: piece.type,
            });
          }
        }
      }
    }
  }

  private drawGhostPiece(piece: ActivePiece, ghostY: number): void {
    const shape = TETROMINO_SHAPES[piece.type][piece.rotation];
    const colorInfo = TETROMINO_COLORS[piece.type];
    const ctx = this.ctx;

    ctx.save();
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[0].length; c++) {
        if (shape[r][c] !== 0) {
          const boardX = piece.x + c;
          const visibleY = ghostY + r - BOARD_BUFFER_HEIGHT;

          if (visibleY >= 0) {
            const px = boardX * this.cellSize;
            const py = visibleY * this.cellSize;
            const size = this.cellSize;

            ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.strokeStyle = colorInfo.primary;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);

            ctx.beginPath();
            ctx.roundRect(px + 2, py + 2, size - 4, size - 4, 3);
            ctx.fill();
            ctx.stroke();
          }
        }
      }
    }
    ctx.restore();
  }

  private drawCell(
    gridX: number,
    gridY: number,
    cell: Cell,
    isFalling: boolean = false
  ): void {
    const ctx = this.ctx;
    const px = gridX * this.cellSize;
    const py = gridY * this.cellSize;
    const size = this.cellSize;
    const radius = 4;
    const colorInfo = TETROMINO_COLORS[cell.type] || {
      primary: cell.color,
      secondary: cell.color,
      glow: cell.glowColor || cell.color,
      border: '#ffffff',
      highlight: '#ffffff',
    };

    ctx.save();

    // Subtle falling motion blur/tail
    if (isFalling) {
      ctx.shadowColor = colorInfo.glow;
      ctx.shadowBlur = 10;
    }

    // Outer Beveled Box with Gradient
    const gradient = ctx.createLinearGradient(px, py, px + size, py + size);
    gradient.addColorStop(0, colorInfo.primary);
    gradient.addColorStop(1, colorInfo.secondary);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(px + 1, py + 1, size - 2, size - 2, radius);
    ctx.fill();

    // Glossy Top-Left Specular Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 3);
    ctx.lineTo(px + size - 4, py + 3);
    ctx.lineTo(px + size - 7, py + 6);
    ctx.lineTo(px + 6, py + 6);
    ctx.lineTo(px + 6, py + size - 7);
    ctx.lineTo(px + 3, py + size - 4);
    ctx.closePath();
    ctx.fill();

    // Dark Bottom-Right Bevel Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.moveTo(px + size - 3, py + size - 3);
    ctx.lineTo(px + 3, py + size - 3);
    ctx.lineTo(px + 6, py + size - 6);
    ctx.lineTo(px + size - 6, py + size - 6);
    ctx.lineTo(px + size - 6, py + 6);
    ctx.lineTo(px + size - 3, py + 3);
    ctx.closePath();
    ctx.fill();

    // Fine inner border
    ctx.strokeStyle = colorInfo.border;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.roundRect(px + 2, py + 2, size - 4, size - 4, radius - 1);
    ctx.stroke();

    ctx.restore();
  }

  private drawLineClearFlash(rows: number[], w: number): void {
    const ctx = this.ctx;
    ctx.save();
    for (const r of rows) {
      const visibleY = r - BOARD_BUFFER_HEIGHT;
      if (visibleY < 0) continue;

      const py = visibleY * this.cellSize;
      const h = this.cellSize;

      const grad = ctx.createLinearGradient(0, py, w, py);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
      grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.95)');
      grad.addColorStop(1, 'rgba(255, 255, 255, 0.2)');

      ctx.fillStyle = grad;
      ctx.shadowColor = '#00f5ff';
      ctx.shadowBlur = 20;
      ctx.fillRect(0, py, w, h);
    }
    ctx.restore();
  }

  private updateAndDrawParticles(deltaMs: number): void {
    const ctx = this.ctx;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += deltaMs;
      if (p.life >= p.maxLife) {
        this.particles.splice(i, 1);
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15; // Gravity
      p.alpha = 1 - p.life / p.maxLife;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;

      if (p.shape === 'spark') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.restore();
    }
  }

  private updateAndDrawFloatingTexts(deltaMs: number): void {
    const ctx = this.ctx;
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life += deltaMs;
      if (ft.life >= ft.maxLife) {
        this.floatingTexts.splice(i, 1);
        continue;
      }

      // Smooth rise and bounce
      const progress = ft.life / ft.maxLife;
      ft.y -= 0.6;
      if (progress < 0.2) {
        ft.scale = 0.5 + (progress / 0.2) * 0.7; // Pop in
      } else if (progress < 0.3) {
        ft.scale = 1.2 - ((progress - 0.2) / 0.1) * 0.2; // Settle to 1.0
      } else {
        ft.scale = 1.0;
      }
      ft.alpha = 1 - Math.pow(progress, 2);

      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);

      ctx.font = 'bold 22px "Chakra Petch", "Geist Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow & Text
      ctx.shadowColor = ft.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(ft.text, 0, 0);

      if (ft.subtext) {
        ctx.font = '14px "Chakra Petch", "Geist Mono", monospace';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.subtext, 0, 24);
      }

      ctx.restore();
    }
  }

  private drawCRTOverlay(w: number, h: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    for (let y = 0; y < h; y += 3) {
      ctx.fillRect(0, y, w, 1);
    }
    ctx.restore();
  }
}
