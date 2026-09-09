/**
 * 一局成語填字的純 reducer。
 *
 * 與 `src/lib/useGame.js` 同樣的理由不把狀態放在 closure：連續快速點選時
 * render 可能落後於輸入，用舊的 fills 覆寫會掉格。這裡所有轉移都是純函式，
 * 回傳新狀態，React 之外（測試、持久化）也能直接驅動。
 *
 * 狀態用「格子 -> 候選字池索引」而不是「格子 -> 字」來記，因為池是有限的多重
 * 集合：同一個字可能出現兩次，必須分辨玩家用掉的是哪一顆，清除時才還得回去。
 */

const NO_SELECTION = -1;
const UNASSIGNED = -1;

export const IDIOM_PLAY_SCHEMA_VERSION = 1;

/** 開一局。puzzle 來自 generatePuzzle，視為唯讀。 */
export function createPlayState(puzzle) {
  return {
    schemaVersion: IDIOM_PLAY_SCHEMA_VERSION,
    puzzle,
    assign: puzzle.cells.map(() => UNASSIGNED),
    revealed: puzzle.cells.map(() => false),
    sel: NO_SELECTION,
    reveals: 0,
    solved: false
  };
}

/** 這一格是否為玩家不能更動的格子（提示字或已揭示）。 */
export function isLocked(state, cell) {
  return Boolean(state.puzzle.clues[cell]) || state.revealed[cell];
}

/** 這一格目前顯示的字；空白回傳 null。 */
export function charAt(state, cell) {
  if (state.puzzle.clues[cell] || state.revealed[cell]) return state.puzzle.solution[cell];
  const slot = state.assign[cell];
  return slot === UNASSIGNED ? null : state.puzzle.pool[slot];
}

/** 候選字池中尚未被使用的項目索引。 */
export function freePoolSlots(state) {
  const used = new Set(state.assign.filter((slot) => slot !== UNASSIGNED));
  return state.puzzle.pool.map((_, slot) => slot).filter((slot) => !used.has(slot));
}

/** 已填但與答案不符的格子；標示錯誤與完成判定都用它。 */
export function wrongCells(state) {
  const wrong = [];
  state.assign.forEach((slot, cell) => {
    if (slot === UNASSIGNED) return;
    if (state.puzzle.pool[slot] !== state.puzzle.solution[cell]) wrong.push(cell);
  });
  return wrong;
}

/** 盤面是否已填滿（不論對錯）。 */
export function isFull(state) {
  return state.assign.every((slot, cell) => slot !== UNASSIGNED || isLocked(state, cell));
}

function checkSolved(state) {
  const solved = state.puzzle.cells.every(
    (_, cell) => isLocked(state, cell) || charAt(state, cell) === state.puzzle.solution[cell]
  );
  return solved === state.solved ? state : { ...state, solved };
}

/**
 * 把某個池項目放進某格。
 *
 * 兩種佔用都要先讓開：該格原本用的項目要還回池裡，該項目原本佔的格子要清空。
 * 後者讓「同一顆字換個位置」變成一步操作，不必先清除再填。
 */
function placeSlot(state, cell, slot) {
  if (isLocked(state, cell)) return state;
  if (slot < 0 || slot >= state.puzzle.pool.length) return state;
  if (state.assign[cell] === slot) return state;
  const assign = state.assign.slice();
  const previousCell = assign.indexOf(slot);
  if (previousCell !== -1) assign[previousCell] = UNASSIGNED;
  assign[cell] = slot;
  return checkSolved({ ...state, assign });
}

function clearCell(state, cell) {
  if (isLocked(state, cell) || state.assign[cell] === UNASSIGNED) return state;
  const assign = state.assign.slice();
  assign[cell] = UNASSIGNED;
  return checkSolved({ ...state, assign });
}

/**
 * 揭示一格。
 *
 * 正確的那顆字可能正被誤放在別格，所以池裡找不到空閒的就從誤放處收回來，
 * 否則池的總數會對不上，玩家會發現少了一顆字。
 */
function revealCell(state, cell) {
  if (isLocked(state, cell)) return state;
  const answer = state.puzzle.solution[cell];
  const assign = state.assign.slice();
  assign[cell] = UNASSIGNED;
  const used = new Set(assign.filter((slot) => slot !== UNASSIGNED));
  let slot = state.puzzle.pool.findIndex((char, i) => char === answer && !used.has(i));
  if (slot === -1) slot = state.puzzle.pool.findIndex((char) => char === answer);
  if (slot !== -1) {
    const holder = assign.indexOf(slot);
    if (holder !== -1) assign[holder] = UNASSIGNED;
    assign[cell] = slot;
  }
  const revealed = state.revealed.slice();
  revealed[cell] = true;
  return checkSolved({ ...state, assign, revealed, reveals: state.reveals + 1 });
}

export function idiomPlayReducer(state, action) {
  switch (action.type) {
    case 'select':
      return state.sel === action.cell ? state : { ...state, sel: action.cell };

    case 'deselect':
      return state.sel === NO_SELECTION ? state : { ...state, sel: NO_SELECTION };

    // 點格再點字：沒有選取的格子時，點池不做事，而不是猜一格填。
    case 'pick':
      return state.sel === NO_SELECTION ? state : placeSlot(state, state.sel, action.slot);

    case 'place':
      return placeSlot(state, action.cell, action.slot);

    case 'clear':
      return clearCell(state, action.cell ?? state.sel);

    case 'reveal':
      return revealCell(state, action.cell ?? state.sel);

    case 'restore':
      return checkSolved(action.state);

    default:
      return state;
  }
}
