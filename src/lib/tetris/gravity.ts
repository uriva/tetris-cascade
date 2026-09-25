import { Board, Cell, FallingBlock, GravityMode } from './types';
import { BOARD_WIDTH, BOARD_TOTAL_HEIGHT } from './constants';

/**
 * Checks which rows on the board are completely filled.
 */
export function findFullLines(board: Board): number[] {
  const fullRows: number[] = [];
  for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
    let isFull = true;
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (!board[y][x] || !board[y][x]?.filled) {
        isFull = false;
        break;
      }
    }
    if (isFull) {
      fullRows.push(y);
    }
  }
  return fullRows;
}

/**
 * Removes full rows by turning their cells into null (leaves the gap).
 * This allows the cascade gravity system to detect in-air bricks and drop them.
 */
export function clearRowsToEmpty(board: Board, rows: number[]): Board {
  const newBoard: Board = board.map(row => [...row]);
  const rowSet = new Set(rows);

  for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
    if (rowSet.has(y)) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        newBoard[y][x] = null;
      }
    }
  }
  return newBoard;
}

/**
 * Applies individual brick cascade gravity:
 * Any brick that has air (empty cells) beneath it falls down to the lowest available slot in its column.
 */
export function applyIndividualGravity(board: Board): {
  newBoard: Board;
  fallenBlocks: FallingBlock[];
  hasFallen: boolean;
} {
  const newBoard: Board = Array.from({ length: BOARD_TOTAL_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(null)
  );
  const fallenBlocks: FallingBlock[] = [];
  let hasFallen = false;

  for (let x = 0; x < BOARD_WIDTH; x++) {
    let targetY = BOARD_TOTAL_HEIGHT - 1;

    // Scan from bottom to top
    for (let y = BOARD_TOTAL_HEIGHT - 1; y >= 0; y--) {
      const cell = board[y][x];
      if (cell && cell.filled) {
        newBoard[targetY][x] = cell;
        if (targetY !== y) {
          hasFallen = true;
          fallenBlocks.push({
            fromY: y,
            toY: targetY,
            x,
            cell,
            progress: 0,
          });
        }
        targetY--;
      }
    }
  }

  return { newBoard, fallenBlocks, hasFallen };
}

/**
 * Applies connected cluster gravity:
 * 1. Initial clusters touching the bottom floor at t=0 are supported. Their overhangs
 *    stay in the air because they were already connected to a grounded structure.
 * 2. Unsupported clusters drop downward together as rigid pieces until landing on
 *    the floor or on a block directly beneath them.
 * 3. Falling clusters DO NOT stop by gluing to walls/pillars on their sides while falling.
 */
export function applyConnectedGravity(board: Board): {
  newBoard: Board;
  fallenBlocks: FallingBlock[];
  hasFallen: boolean;
} {
  // Deep copy board
  const currentBoard: Board = board.map(row => [...row]);
  const initialPositions = new Map<string, number>();

  // Store initial positions of all cells
  for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (currentBoard[y][x]) {
        const id = currentBoard[y][x]?.id || `${x},${y}`;
        initialPositions.set(id, y);
      }
    }
  }

  // 1. Identify initial connected components at t = 0
  const visited: boolean[][] = Array.from({ length: BOARD_TOTAL_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(false)
  );
  const clusters: Array<Array<{ x: number; y: number; cell: Cell }>> = [];

  for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (currentBoard[y][x] && !visited[y][x]) {
        const cluster: Array<{ x: number; y: number; cell: Cell }> = [];
        const queue: Array<{ x: number; y: number }> = [{ x, y }];
        visited[y][x] = true;

        while (queue.length > 0) {
          const curr = queue.shift()!;
          cluster.push({ x: curr.x, y: curr.y, cell: currentBoard[curr.y][curr.x]! });

          const neighbors = [
            { x: curr.x + 1, y: curr.y },
            { x: curr.x - 1, y: curr.y },
            { x: curr.x, y: curr.y + 1 },
            { x: curr.x, y: curr.y - 1 },
          ];

          for (const n of neighbors) {
            if (
              n.x >= 0 &&
              n.x < BOARD_WIDTH &&
              n.y >= 0 &&
              n.y < BOARD_TOTAL_HEIGHT &&
              !visited[n.y][n.x] &&
              currentBoard[n.y][n.x]
            ) {
              visited[n.y][n.x] = true;
              queue.push(n);
            }
          }
        }

        clusters.push(cluster);
      }
    }
  }

  // 2. Identify initial grounded clusters:
  // Clusters connected to the bottom floor (y = BOARD_TOTAL_HEIGHT - 1) at t = 0 are supported.
  // Their overhangs stay in the air because they were already connected to a grounded structure.
  const fallingClusters: Array<Array<{ x: number; y: number; cell: Cell }>> = [];

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    if (!cluster.some(pt => pt.y === BOARD_TOTAL_HEIGHT - 1)) {
      fallingClusters.push(cluster);
    }
  }

  // If nothing is unsupported, return immediately
  if (fallingClusters.length === 0) {
    return { newBoard: currentBoard, fallenBlocks: [], hasFallen: false };
  }

  // Clear all falling clusters from the board to simulate their fall downward
  for (const cluster of fallingClusters) {
    for (const pt of cluster) {
      currentBoard[pt.y][pt.x] = null;
    }
  }

  // 3. Drop falling clusters step by step.
  // Falling clusters only stop when hitting the floor or landing on a block beneath them.
  // Crucially, they DO NOT glue to walls or pillars on their side as they fall!
  let activeFalling = fallingClusters.map(c => c.map(pt => ({ ...pt })));
  let stepped = true;
  let iterations = 0;

  while (stepped && activeFalling.length > 0) {
    iterations++;
    if (iterations > 100) break;
    stepped = false;

    // Sort by lowest points first so lower clusters land before higher clusters
    activeFalling.sort((a, b) => {
      const maxYa = Math.max(...a.map(p => p.y));
      const maxYb = Math.max(...b.map(p => p.y));
      return maxYb - maxYa;
    });

    const stillFalling: Array<Array<{ x: number; y: number; cell: Cell }>> = [];

    for (const cluster of activeFalling) {
      let canFall = true;
      for (const pt of cluster) {
        const nextY = pt.y + 1;
        if (nextY >= BOARD_TOTAL_HEIGHT) {
          canFall = false; // Hit floor
          break;
        }
        if (currentBoard[nextY][pt.x] !== null) {
          canFall = false; // Landed on a block below
          break;
        }
      }

      if (canFall) {
        for (const pt of cluster) {
          pt.y += 1;
        }
        stepped = true;
        stillFalling.push(cluster);
      } else {
        // Cluster has landed! Place its blocks permanently so clusters above can land on it
        for (const pt of cluster) {
          currentBoard[pt.y][pt.x] = pt.cell;
        }
        stepped = true;
      }
    }

    activeFalling = stillFalling;
  }

  // Place any remaining clusters (safeguard)
  for (const cluster of activeFalling) {
    for (const pt of cluster) {
      currentBoard[pt.y][pt.x] = pt.cell;
    }
  }

  // Compile fallen blocks for animation
  const fallenBlocks: FallingBlock[] = [];
  let anyFellOverall = false;

  for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      const cell = currentBoard[y][x];
      if (cell) {
        const id = cell.id || `${x},${y}`;
        const initialY = initialPositions.get(id);
        if (initialY !== undefined && initialY !== y) {
          anyFellOverall = true;
          fallenBlocks.push({
            fromY: initialY,
            toY: y,
            x,
            cell,
            progress: 0,
          });
        }
      }
    }
  }

  return { newBoard: currentBoard, fallenBlocks, hasFallen: anyFellOverall };
}

/**
 * Universal gravity dispatcher based on user settings.
 * Defaults to connected cascade gravity where bricks only fall if nothing holds them
 * down (from below) or from the side.
 */
export function applyGravity(
  board: Board,
  mode: GravityMode = 'connected'
): {
  newBoard: Board;
  fallenBlocks: FallingBlock[];
  hasFallen: boolean;
} {
  if (mode === 'individual') {
    return applyIndividualGravity(board);
  }
  // 'connected' and 'cascade' both use connected gravity: bricks stay together
  // and only drop if unsupported from below and from the side
  return applyConnectedGravity(board);
}

/**
 * Checks if the visible board is completely empty (All Clear / Perfect Clear)
 */
export function checkPerfectClear(board: Board): boolean {
  for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      if (board[y][x] && board[y][x]?.filled) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Creates an empty game board
 */
export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_TOTAL_HEIGHT }, () =>
    Array(BOARD_WIDTH).fill(null)
  );
}
