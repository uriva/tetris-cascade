import { TetrominoType } from './types';

const PIECE_TYPES: TetrominoType[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

export class PieceRandomizer {
  private queue: TetrominoType[] = [];

  constructor() {
    this.refill();
    this.refill();
  }

  private shuffle(array: TetrominoType[]): TetrominoType[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  private refill(): void {
    const newBag = this.shuffle(PIECE_TYPES);
    this.queue.push(...newBag);
  }

  public next(): TetrominoType {
    if (this.queue.length <= 7) {
      this.refill();
    }
    const piece = this.queue.shift();
    if (!piece) {
      this.refill();
      return this.queue.shift()!;
    }
    return piece;
  }

  public peek(count: number = 5): TetrominoType[] {
    while (this.queue.length < count + 7) {
      this.refill();
    }
    return this.queue.slice(0, count);
  }

  public reset(): void {
    this.queue = [];
    this.refill();
    this.refill();
  }
}
