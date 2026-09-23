import {
  createEmptyBoard,
  clearRowsToEmpty,
  findFullLines,
  applyIndividualGravity,
  applyGravity,
} from '../src/lib/tetris/gravity.ts';
import { BOARD_WIDTH, BOARD_TOTAL_HEIGHT } from '../src/lib/tetris/constants.ts';
import { Cell } from '../src/lib/tetris/types.ts';

function makeCell(type: 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' = 'T'): Cell {
  return {
    filled: true,
    color: '#c084fc',
    glowColor: 'rgba(192, 132, 252, 0.7)',
    type,
    id: `test-${Math.random()}`,
  };
}

console.log('--- Testing In-Air Cascade Gravity ---');

const board = createEmptyBoard();

// Let's create a board where bottom row (row 23) has a full line:
for (let x = 0; x < BOARD_WIDTH; x++) {
  board[23][x] = makeCell('I');
}

// Row 22 has a single floating brick at col 3:
board[22][3] = makeCell('T');

// Row 21 has another brick at col 3 (stacking on row 22):
board[21][3] = makeCell('T');

// Row 21 also has a brick at col 5 (floating directly above empty space at row 22 and 23):
// wait, row 23 is full, so row 22 col 5 was empty.

console.log('1. Initial state:');
const fullRows = findFullLines(board);
console.log('   Full rows found:', fullRows);
if (fullRows.length !== 1 || fullRows[0] !== 23) {
  throw new Error(`Expected row 23 to be full, got ${fullRows}`);
}

// Clear row 23:
const boardWithGap = clearRowsToEmpty(board, fullRows);
console.log('2. Cleared row 23 to empty.');

// Now brick at (3, 22) and (3, 21) are in the air because row 23 is empty!
const { newBoard, fallenBlocks, hasFallen } = applyGravity(boardWithGap, 'cascade');

console.log('3. Gravity applied:');
console.log('   hasFallen:', hasFallen);
console.log('   fallenBlocks count:', fallenBlocks.length);

// Brick at (3, 22) should have fallen to (3, 23) (the floor)
// Brick at (3, 21) should have fallen to (3, 22) (stacked above row 23)
if (!hasFallen) {
  throw new Error('Expected bricks to fall down!');
}

if (!newBoard[23][3]?.filled) {
  throw new Error('Expected brick to land on floor at row 23 col 3');
}

if (!newBoard[22][3]?.filled) {
  throw new Error('Expected stacked brick to land at row 22 col 3');
}

if (newBoard[21][3] !== null) {
  throw new Error('Expected row 21 col 3 to be empty after falling');
}

console.log('✓ In-air bricks successfully fell down to the floor!');

// Test 4: Chain reaction / cascade scenario
// Suppose row 22 had 9 cells filled (cols 0-8) and col 9 was empty.
// Above it at col 9, row 20 was a floating brick.
// When row 23 clears, the floating brick at col 9 falls down into row 22, filling the hole!
const board2 = createEmptyBoard();
// Full row at 23
for (let x = 0; x < BOARD_WIDTH; x++) board2[23][x] = makeCell('I');
// Row 22 has cells 0 to 8 filled, cell 9 empty
for (let x = 0; x < BOARD_WIDTH - 1; x++) board2[22][x] = makeCell('O');
// Floating brick at col 9, row 20
board2[20][9] = makeCell('Z');

// Clear row 23
const b2Gap = clearRowsToEmpty(board2, [23]);
// Apply gravity
const res2 = applyGravity(b2Gap, 'cascade');

// After falling:
// Row 22 cells 0 to 8 fall to row 23!
// Cell (9, 20) falls to row 23 col 9!
// Now row 23 is completely full again! (Chain reaction!)
const fullRowsChain = findFullLines(res2.newBoard);
console.log('4. Chain reaction check: Full rows after cascade:', fullRowsChain);

if (!fullRowsChain.includes(23)) {
  throw new Error('Expected row 23 to be filled by the falling brick, creating a cascade chain reaction!');
}

console.log('✓ Chain reaction verified! Falling bricks formed a new full line.');
console.log('All gravity tests passed successfully!');
