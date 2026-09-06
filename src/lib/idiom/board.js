/**
 * 盤面幾何。
 *
 * 詞條（run）一律四格，方向只有向右（across）與向下（down），
 * 以起點座標 `{ row, col }` 表示。生成期間座標可以是負數，最後才
 * 平移到外接矩形的原點。
 *
 * 這裡的核心是 `canAttach`：新詞條只能以「與已放置的垂直方向詞條
 * 共用剛好一格」的方式接上，且盤面上任何長度 ≥ 2 的最大連續字串都
 * 必須剛好是一個已宣告的四字詞條。後面這條不變式一次涵蓋了
 * 「平行相鄰」「共線相接」「同向重疊」三種違規：任何一種都會產生
 * 一個沒有對應詞條的連續字串。
 */

import { IDIOM_LENGTH } from './corpus.js';

export const MAX_DIMENSION = 9;
export const ORIENTATIONS = ['across', 'down'];

export function perpendicular(orientation) {
  return orientation === 'across' ? 'down' : 'across';
}

export function cellKey(row, col) {
  return `${row},${col}`;
}

/** 詞條佔用的四格座標，依閱讀順序。 */
export function runCellPositions(run) {
  const output = [];
  for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
    output.push(run.orientation === 'across'
      ? { row: run.row, col: run.col + offset }
      : { row: run.row + offset, col: run.col });
  }
  return output;
}

/** 由詞條列表推出格子佔用表；共用格會同時記下橫豎兩個詞條。 */
export function latticeOccupancy(runs) {
  const cells = new Map();
  runs.forEach((run, id) => {
    runCellPositions(run).forEach((position, offset) => {
      const key = cellKey(position.row, position.col);
      const existing = cells.get(key);
      if (existing) {
        existing[run.orientation] = id;
        return;
      }
      cells.set(key, {
        row: position.row,
        col: position.col,
        char: run.idiom[offset],
        across: run.orientation === 'across' ? id : null,
        down: run.orientation === 'down' ? id : null
      });
    });
  });
  return cells;
}

export function boundingBox(runs) {
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  runs.forEach((run) => {
    runCellPositions(run).forEach((position) => {
      if (position.row < minRow) minRow = position.row;
      if (position.row > maxRow) maxRow = position.row;
      if (position.col < minCol) minCol = position.col;
      if (position.col > maxCol) maxCol = position.col;
    });
  });
  if (!runs.length) return { minRow: 0, maxRow: -1, minCol: 0, maxCol: -1, height: 0, width: 0 };
  return { minRow, maxRow, minCol, maxCol, height: maxRow - minRow + 1, width: maxCol - minCol + 1 };
}

/**
 * 盤面上每個長度 ≥ 2 的最大連續字串，都必須剛好對應一個已宣告的詞條。
 * 這同時擋掉平行相鄰、共線相接與同向重疊。
 */
export function maximalStringsValid(runs) {
  const cells = latticeOccupancy(runs);
  const originOf = new Map();
  runs.forEach((run) => originOf.set(`${run.orientation}:${cellKey(run.row, run.col)}`, run));

  for (const cell of cells.values()) {
    if (!cells.has(cellKey(cell.row, cell.col - 1))) {
      let length = 1;
      while (cells.has(cellKey(cell.row, cell.col + length))) length += 1;
      if (length > 1 && (length !== IDIOM_LENGTH || !originOf.has(`across:${cellKey(cell.row, cell.col)}`))) return false;
    }
    if (!cells.has(cellKey(cell.row - 1, cell.col))) {
      let length = 1;
      while (cells.has(cellKey(cell.row + length, cell.col))) length += 1;
      if (length > 1 && (length !== IDIOM_LENGTH || !originOf.has(`down:${cellKey(cell.row, cell.col)}`))) return false;
    }
  }
  return true;
}

/** 共用格的字在橫豎兩個詞條中必須相同。 */
export function charactersAgree(runs) {
  const cells = new Map();
  for (const run of runs) {
    const positions = runCellPositions(run);
    for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
      const key = cellKey(positions[offset].row, positions[offset].col);
      const existing = cells.get(key);
      if (existing !== undefined && existing !== run.idiom[offset]) return false;
      cells.set(key, run.idiom[offset]);
    }
  }
  return true;
}

/**
 * 只看候選詞條四周的快速相鄰檢查。
 *
 * 加入一條詞條只會改變「經過它的格子」的連續字串，所以不必重掃整個盤面：
 *   - 頭尾兩端的延伸格必須是空的（否則同方向會接成 5 字以上的字串）
 *   - 每一格的左右（或上下）鄰格若被佔用，該鄰格必須與這一格同屬同一條
 *     垂直方向的詞條，也就是只有交叉的那一列（或那一行）允許有鄰居
 *
 * `maximalStringsValid` 是同一條規則的全盤版本，測試會交叉比對兩者一致。
 */
function adjacencyRejection(occupancy, candidate) {
  const positions = runCellPositions(candidate);
  const along = candidate.orientation === 'across' ? { row: 0, col: 1 } : { row: 1, col: 0 };
  const side = candidate.orientation === 'across' ? { row: 1, col: 0 } : { row: 0, col: 1 };
  const head = positions[0];
  const tail = positions[IDIOM_LENGTH - 1];
  if (occupancy.has(cellKey(head.row - along.row, head.col - along.col))) return 'adjacent-parallel';
  if (occupancy.has(cellKey(tail.row + along.row, tail.col + along.col))) return 'adjacent-parallel';

  const crossing = perpendicular(candidate.orientation);
  for (const position of positions) {
    const here = occupancy.get(cellKey(position.row, position.col));
    for (const sign of [-1, 1]) {
      const neighbour = occupancy.get(cellKey(position.row + sign * side.row, position.col + sign * side.col));
      if (!neighbour) continue;
      if (!here || here[crossing] === null || here[crossing] !== neighbour[crossing]) return 'adjacent-parallel';
    }
  }
  return null;
}

/** 生長迴圈每回合只算一次的盤面快照，讓候選掃描不必重建佔用表。 */
export function latticeContext(runs) {
  return { occupancy: latticeOccupancy(runs), box: boundingBox(runs), idioms: new Set(runs.map((run) => run.idiom)) };
}

/**
 * 候選詞條能否接上目前盤面。回傳拒絕原因或 null（可放置）。
 * 拆成具名原因，讓每一條拒絕規則都能被單獨測試。
 */
export function attachmentRejection(runs, candidate, options = {}) {
  const maxDimension = options.maxDimension ?? MAX_DIMENSION;
  const context = options.context ?? latticeContext(runs);
  if (!ORIENTATIONS.includes(candidate.orientation)) return 'orientation';
  if ([...candidate.idiom].length !== IDIOM_LENGTH) return 'length';
  if (context.idioms.has(candidate.idiom)) return 'duplicate-idiom';

  const positions = runCellPositions(candidate);
  let shared = 0;
  for (let offset = 0; offset < IDIOM_LENGTH; offset += 1) {
    const cell = context.occupancy.get(cellKey(positions[offset].row, positions[offset].col));
    if (!cell) continue;
    shared += 1;
    if (cell.char !== candidate.idiom[offset]) return 'character-conflict';
    if (cell[candidate.orientation] !== null) return 'parallel-overlap';
  }
  const requiredShared = context.occupancy.size === 0 ? 0 : 1;
  if (shared !== requiredShared) return shared === 0 ? 'not-attached' : 'multiple-crossings';

  const box = context.box;
  const rows = [box.minRow, box.maxRow, positions[0].row, positions[IDIOM_LENGTH - 1].row];
  const cols = [box.minCol, box.maxCol, positions[0].col, positions[IDIOM_LENGTH - 1].col];
  if (context.occupancy.size === 0) {
    rows.splice(0, 2);
    cols.splice(0, 2);
  }
  if (Math.max(...rows) - Math.min(...rows) + 1 > maxDimension) return 'oversized';
  if (Math.max(...cols) - Math.min(...cols) + 1 > maxDimension) return 'oversized';

  return adjacencyRejection(context.occupancy, candidate);
}

export function canAttach(runs, candidate, options) {
  return attachmentRejection(runs, candidate, options) === null;
}

/**
 * 裁切到外接矩形，產出可序列化的盤面。
 * `cells` 依列優先排序，`grid` 給版面用，`runs.cells` 存 cell index。
 */
export function normaliseBoard(runs) {
  const box = boundingBox(runs);
  const shifted = runs.map((run) => ({ ...run, row: run.row - box.minRow, col: run.col - box.minCol }));
  const width = box.width;
  const height = box.height;

  const occupancy = latticeOccupancy(shifted);
  const cells = [];
  const grid = new Array(width * height).fill(-1);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      const cell = occupancy.get(cellKey(row, col));
      if (!cell) continue;
      grid[row * width + col] = cells.length;
      cells.push({ row, col, char: cell.char, crossing: cell.across !== null && cell.down !== null });
    }
  }

  const boardRuns = shifted.map((run, id) => ({
    id,
    orientation: run.orientation,
    row: run.row,
    col: run.col,
    idiom: run.idiom,
    cells: runCellPositions(run).map((position) => grid[position.row * width + position.col])
  }));

  return {
    width,
    height,
    grid,
    cells: cells.map(({ row, col, crossing }) => ({ row, col, crossing })),
    solution: cells.map((cell) => cell.char),
    runs: boardRuns,
    crossings: cells.filter((cell) => cell.crossing).length
  };
}
