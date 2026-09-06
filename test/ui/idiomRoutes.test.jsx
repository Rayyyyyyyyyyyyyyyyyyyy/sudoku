import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../src/App.jsx';
import { generatePuzzle } from '../../src/lib/idiom/index.js';
import { IDIOM_SNAPSHOT_KEY, snapshotOf } from '../../src/lib/idiom/persistence.js';
import { createPlayState, isLocked } from '../../src/lib/idiom/play.js';

const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );

/** 盤面上第一個可填的格子（非提示字）。 */
function firstBlank(puzzle) {
  const state = createPlayState(puzzle);
  const cell = puzzle.cells.findIndex((_, i) => !isLocked(state, i));
  return { cell, position: puzzle.cells[cell], answer: puzzle.solution[cell] };
}

describe('idiom crossword routes', () => {
  it('shows the idiom card on the hub and navigates to its home', async () => {
    const user = userEvent.setup();
    renderAt('/');
    expect(screen.getByRole('heading', { name: '成語填字' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /進入填字/ }));
    expect(await screen.findByRole('heading', { name: '選擇難度' })).toBeInTheDocument();
  });

  it('leaves the Sudoku and poker cards intact', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { name: '數獨刷題' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '通勤牌局' })).toBeInTheDocument();
  });

  it('renders a board and a candidate pool at a seeded route', async () => {
    renderAt('/idiom/play/0?seed=7919');
    expect(await screen.findByRole('grid', { name: /成語填字盤面/ })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '候選字' })).toBeInTheDocument();
  });

  it('fills a cell by tapping the cell then a pool character', async () => {
    const user = userEvent.setup();
    const puzzle = generatePuzzle(0, 7919);
    const { position, answer } = firstBlank(puzzle);
    renderAt('/idiom/play/0?seed=7919');

    const label = new RegExp(`^第 ${position.row + 1} 列第 ${position.col + 1} 行`);
    await user.click(await screen.findByRole('gridcell', { name: label }));
    const pool = screen.getByRole('region', { name: '候選字' });
    await user.click(within(pool).getAllByRole('button', { name: `候選字 ${answer}` })[0]);

    await waitFor(() =>
      expect(screen.getByRole('gridcell', { name: label })).toHaveAccessibleName(
        new RegExp(`第 ${position.row + 1} 列第 ${position.col + 1} 行，${answer}`)
      )
    );
  });

  it('fills a cell using only the keyboard', async () => {
    const user = userEvent.setup();
    const puzzle = generatePuzzle(0, 7919);
    const { position, answer } = firstBlank(puzzle);
    renderAt('/idiom/play/0?seed=7919');

    const label = new RegExp(`^第 ${position.row + 1} 列第 ${position.col + 1} 行`);
    const cell = await screen.findByRole('gridcell', { name: label });
    cell.focus();
    expect(cell).toHaveFocus();
    await user.keyboard('{Enter}');

    const pool = screen.getByRole('region', { name: '候選字' });
    const chip = within(pool).getAllByRole('button', { name: `候選字 ${answer}` })[0];
    chip.focus();
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('gridcell', { name: label })).toHaveAccessibleName(
        new RegExp(`，${answer}`)
      )
    );
  });

  it('a used pool character is disabled and returns when the cell is cleared', async () => {
    const user = userEvent.setup();
    const puzzle = generatePuzzle(0, 7919);
    const { position, answer } = firstBlank(puzzle);
    renderAt('/idiom/play/0?seed=7919');

    const label = new RegExp(`^第 ${position.row + 1} 列第 ${position.col + 1} 行`);
    await user.click(await screen.findByRole('gridcell', { name: label }));
    const pool = screen.getByRole('region', { name: '候選字' });
    await user.click(within(pool).getAllByRole('button', { name: `候選字 ${answer}` })[0]);
    await waitFor(() =>
      expect(within(pool).getByRole('button', { name: `候選字 ${answer}，已使用` })).toBeDisabled()
    );

    await user.click(screen.getByRole('button', { name: '清除這格' }));
    await waitFor(() =>
      expect(within(pool).getAllByRole('button', { name: `候選字 ${answer}` })[0]).toBeEnabled()
    );
  });

  it('revealing a cell locks it and counts the reveal', async () => {
    const user = userEvent.setup();
    const puzzle = generatePuzzle(0, 7919);
    const { position } = firstBlank(puzzle);
    renderAt('/idiom/play/0?seed=7919');

    const label = new RegExp(`^第 ${position.row + 1} 列第 ${position.col + 1} 行`);
    await user.click(await screen.findByRole('gridcell', { name: label }));
    await user.click(screen.getByRole('button', { name: '揭示這格' }));

    await waitFor(() =>
      expect(screen.getByRole('gridcell', { name: label })).toHaveAccessibleName(/已揭示/)
    );
    expect(screen.getByText(/揭示 1/)).toBeInTheDocument();
  });

  it('the answer list hides the idioms until the puzzle is solved', async () => {
    const user = userEvent.setup();
    renderAt('/idiom/play/0?seed=7919');
    await user.click(await screen.findByRole('button', { name: /盤面上的成語/ }));
    expect(screen.getAllByText('？？？？').length).toBeGreaterThan(0);
    expect(screen.getByText(/釋義尚未收錄/)).toBeInTheDocument();
  });

  it('resumes a saved puzzle from the idiom home page', async () => {
    const puzzle = generatePuzzle(1, 4242);
    const state = createPlayState(puzzle);
    localStorage.setItem(
      IDIOM_SNAPSHOT_KEY,
      JSON.stringify(snapshotOf(state, { level: 1, seed: 4242, daily: false, startedAt: 0, elapsedMs: 9000 }))
    );
    renderAt('/idiom');
    expect(await screen.findByText('有未完成的題目')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '繼續' })).toBeInTheDocument();
  });

  it('reports an incompatible save without discarding it', async () => {
    const puzzle = generatePuzzle(0, 7919);
    const state = createPlayState(puzzle);
    const snapshot = { ...snapshotOf(state, { level: 0, seed: 7919, startedAt: 0 }), version: 999 };
    localStorage.setItem(IDIOM_SNAPSHOT_KEY, JSON.stringify(snapshot));
    renderAt('/idiom');
    expect(await screen.findByText('存檔版本需要處理')).toBeInTheDocument();
    expect(localStorage.getItem(IDIOM_SNAPSHOT_KEY)).not.toBeNull();
  });

  it('renders the daily puzzle route', async () => {
    renderAt('/idiom/daily');
    expect(await screen.findByRole('grid', { name: /成語填字盤面/ })).toBeInTheDocument();
    expect(screen.getByText('每日一題')).toBeInTheDocument();
  });

  it('an unknown idiom path still falls back to the hub', async () => {
    renderAt('/idiom/nope/deeper');
    expect(await screen.findByRole('heading', { name: '通勤遊戲櫃' })).toBeInTheDocument();
  });
});
