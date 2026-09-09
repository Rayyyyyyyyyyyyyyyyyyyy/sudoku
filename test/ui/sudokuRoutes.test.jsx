import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { loadAnyGameSession, persistGameSession } from '../../src/lib/gameSession.js';
import { DAILY_LEVEL, dailySeed } from '../../src/lib/sudoku.js';
import { dayKey } from '../../src/lib/stats.js';

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
