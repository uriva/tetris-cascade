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
 * Orthogonally connected groups of bricks drop together as rigid pieces
 * until any cell in the cluster rests on the floor or an already grounded cell.
 */
export function applyConnectedGravity(board: Board): {
  newBoard: Board;
  fallenBlocks: FallingBlock[];
  hasFallen: boolean;
} {
  // Deep copy board
  const currentBoard: Board = board.map(row => [...row]);
  const fallenBlocks: FallingBlock[] = [];
  let anyFellOverall = false;

  // Simulate falling step-by-step
  let stepFell = true;
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

  while (stepFell) {
    stepFell = false;

    // 1. Identify connected components using BFS/DFS
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

    // 2. Identify grounded clusters (clusters touching the bottom floor)
    const groundedClusterIndices = new Set<number>();
    for (let i = 0; i < clusters.length; i++) {
      if (clusters[i].some(pt => pt.y === BOARD_TOTAL_HEIGHT - 1)) {
        groundedClusterIndices.add(i);
      }
    }

    // 3. Check which ungrounded clusters can fall down by 1 cell
    // A cluster can fall if for every cell in the cluster, the cell directly below (x, y+1)
    // is either part of the same cluster OR empty.
    let clusterMoved = false;
    for (let i = 0; i < clusters.length; i++) {
      if (groundedClusterIndices.has(i)) continue;

      const cluster = clusters[i];
      const clusterCoordSet = new Set(cluster.map(pt => `${pt.x},${pt.y}`));

      let canFall = true;
      for (const pt of cluster) {
        const nextY = pt.y + 1;
        if (nextY >= BOARD_TOTAL_HEIGHT) {
          canFall = false;
          break;
        }
        if (currentBoard[nextY][pt.x] && !clusterCoordSet.has(`${pt.x},${nextY}`)) {
          canFall = false;
          break;
        }
      }

      if (canFall) {
        // Move cluster down by 1
        // Clear old positions
        for (const pt of cluster) {
          currentBoard[pt.y][pt.x] = null;
        }
        // Write new positions
        for (const pt of cluster) {
          currentBoard[pt.y + 1][pt.x] = pt.cell;
        }
        clusterMoved = true;
        anyFellOverall = true;
        stepFell = true;
        break; // Re-evaluate components
      }
    }

    if (!clusterMoved) {
      stepFell = false;
    }
  }

  // Compile fallen blocks for animation
  if (anyFellOverall) {
    for (let y = 0; y < BOARD_TOTAL_HEIGHT; y++) {
      for (let x = 0; x < BOARD_WIDTH; x++) {
        const cell = currentBoard[y][x];
        if (cell) {
          const id = cell.id || `${x},${y}`;
          const initialY = initialPositions.get(id);
          if (initialY !== undefined && initialY !== y) {
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
