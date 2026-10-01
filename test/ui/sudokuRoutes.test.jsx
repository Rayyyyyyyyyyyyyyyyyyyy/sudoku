import { StrictMode } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { loadAnyGameSession, persistGameSession } from '../../src/lib/gameSession.js';
import { DAILY_LEVEL, dailySeed, generate, LEVELS } from '../../src/lib/sudoku.js';
import { dayKey, emptyStats, loadStats, persistStats } from '../../src/lib/stats.js';

function session(overrides = {}) {
  return {
    level: 2,
    seed: 123456,
    isDaily: false,
    values: new Array(81).fill(0),
    notes: Array.from({ length: 81 }, () => []),
    sel: 10,
    pencil: false,
    startedAt: 1_700_000_000_000,
    ...overrides
  };
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="目前路徑">{`${location.pathname}${location.search}`}</output>;
}

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Sudoku challenge and rewards', () => {
  it('offers the harder pool without discarding a current puzzle on cancel', async () => {
    const user = userEvent.setup();
    const saved = session();
    persistGameSession(saved);
    vi.stubGlobal('confirm', vi.fn(() => false));
    renderAt('/sudoku');

    await user.click(screen.getByRole('button', { name: '挑戰極限 →' }));
    expect(loadAnyGameSession()).toEqual(saved);
    expect(screen.getByRole('status', { name: '目前路徑' })).toHaveTextContent('/sudoku');
  });

  it('starts a genuinely harder seeded puzzle from the challenge entry', async () => {
    const user = userEvent.setup();
    renderAt('/sudoku');
    await user.click(screen.getByRole('button', { name: '挑戰極限 →' }));
    await screen.findByRole('button', { name: /^第 1 列第 1 行/ });
    expect(screen.getByRole('status', { name: '目前路徑' })).toHaveTextContent(`/play/${LEVELS.length - 1}?seed=`);
    expect(screen.getByText(/極限 · SE 9\.[23]/)).toBeInTheDocument();
  });

  it('awards a milestone once on real completion and keeps it visible on the home page', async () => {
    const user = userEvent.setup();
    const level = 4;
    const seed = 123456789;
    const board = generate(level, seed);
    const lastCell = board.puzzle.findIndex(value => value === 0);
    const values = board.solution.slice();
    values[lastCell] = 0;
    persistStats({ ...emptyStats(), solved: 4, count: { 4: 4 }, best: { 4: 180000 }, totalMs: 720000 });
    persistGameSession(session({ level, seed, values, sel: lastCell, startedAt: Date.now() - 60000 }));
    localStorage.setItem('sudoku-drill-poker-active-v1', 'preserve-other-game');

    render(<StrictMode><MemoryRouter initialEntries={[`/play/${level}?seed=${seed}`]}><App /></MemoryRouter></StrictMode>);
    await screen.findByRole('button', { name: new RegExp(`第 ${Math.floor(lastCell / 9) + 1} 列第 ${lastCell % 9 + 1} 行 · 空白`) });
    await user.keyboard(String(board.solution[lastCell]));

    const heading = await screen.findByRole('heading', { name: '專家・熟練達成' });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/個人新紀錄/)).toBeInTheDocument();
    expect(loadStats().count[4]).toBe(5);
    expect(loadStats().solved).toBe(5);
    expect(loadAnyGameSession()).toBeNull();
    expect(localStorage.getItem('sudoku-drill-poker-active-v1')).toBe('preserve-other-game');
    expect(screen.getByRole('button', { name: '挑戰極限 →' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '回首頁看徽章' }));
    const trophies = screen.getByRole('region', { name: '你的解題徽章' });
    expect(within(trophies).getByText('熟練')).toBeInTheDocument();
    expect(within(trophies).getByText('2 / 18')).toBeInTheDocument();
    await waitFor(() => expect(loadStats().solved).toBe(5));
  });

  it('celebrates a completed puzzle without claiming permanent rewards when saving fails', async () => {
    const user = userEvent.setup();
    const level = 4;
    const seed = 123456789;
    const board = generate(level, seed);
    const lastCell = board.puzzle.findIndex(value => value === 0);
    const values = board.solution.slice();
    values[lastCell] = 0;
    persistStats({ ...emptyStats(), solved: 4, count: { 4: 4 }, best: { 4: 180000 } });
    persistGameSession(session({ level, seed, values, sel: lastCell, startedAt: Date.now() - 60000 }));
    const setItem = Storage.prototype.setItem;
    const storageSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === 'sudoku-drill-v1') throw new Error('quota exceeded');
      return setItem.call(this, key, value);
    });
    try {
      renderAt(`/play/${level}?seed=${seed}`);
      await screen.findByRole('button', { name: new RegExp(`第 ${Math.floor(lastCell / 9) + 1} 列第 ${lastCell % 9 + 1} 行 · 空白`) });
      await user.keyboard(String(board.solution[lastCell]));
      await screen.findByRole('heading', { name: '這一題，解開了。' });
      expect(screen.getByText('這一題已完成，但本次紀錄與徽章未存入這台裝置。')).toBeInTheDocument();
      expect(screen.queryByText(/本次獲得徽章/)).not.toBeInTheDocument();
      expect(screen.queryByText(/個人新紀錄/)).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '再來一題' })).toBeEnabled();
      expect(loadStats().count[4]).toBe(4);
      await user.click(screen.getByRole('button', { name: '回首頁', exact: true }));
      expect(within(screen.getByRole('region', { name: '你的解題徽章' })).getByText('1 / 18')).toBeInTheDocument();
    } finally {
      storageSpy.mockRestore();
    }
  });
});

describe('Sudoku continuation routes', () => {
  it('continues a seeded session directly from the game hub', async () => {
    const user = userEvent.setup();
    persistGameSession(session());

    renderAt('/');
    expect(screen.getByText(/有未完成題目/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /繼續數獨/ }));

    expect(screen.getByRole('status', { name: '目前路徑' })).toHaveTextContent(
      '/play/2?seed=123456'
    );
  });

  it('continues the current daily session from the Sudoku home', async () => {
    const user = userEvent.setup();
    persistGameSession(
      session({ level: DAILY_LEVEL, seed: dailySeed(dayKey()), isDaily: true })
    );

    renderAt('/sudoku');
    expect(screen.getByRole('region', { name: '未完成的數獨' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '繼續' }));

    expect(screen.getByRole('status', { name: '目前路徑' })).toHaveTextContent('/daily');
  });

  it('keeps the current save when starting a new puzzle is cancelled', async () => {
    const user = userEvent.setup();
    const saved = session();
    persistGameSession(saved);
    const confirm = vi.fn(() => false);
    vi.stubGlobal('confirm', confirm);

    renderAt('/sudoku');
    await user.click(screen.getByRole('button', { name: '開始' }));

    expect(confirm).toHaveBeenCalledWith(
      '開始新題目會放棄目前未完成的進度。確定要繼續嗎？'
    );
    expect(screen.getByRole('status', { name: '目前路徑' })).toHaveTextContent('/sudoku');
    expect(loadAnyGameSession()).toEqual(saved);
  });
});
