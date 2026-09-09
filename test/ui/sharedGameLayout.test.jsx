import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../src/App.jsx';
import { savePokerSnapshot } from '../../src/lib/poker/persistence.js';
import { createNewRun } from '../../src/lib/poker/run.js';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

describe('shared game layout semantics', () => {
  it.each([
    ['/sudoku', '數獨刷題'],
    ['/idiom', '成語填字'],
    ['/poker', '通勤牌局']
  ])('gives %s a main landmark and primary heading', (path, heading) => {
    renderAt(path);
    const main = screen.getByRole('main');
    expect(within(main).getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
    expect(main).toHaveClass('game-home');
  });

  it('shows only Sudoku settings on the Sudoku landing page', () => {
    renderAt('/sudoku');
    expect(screen.getByRole('button', { name: /標示填錯的格子.*ON/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /highlight 同列同行同宮.*ON/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /填數字時自動清註記.*ON/ })).toBeInTheDocument();
    expect(screen.queryByText(/成語填字：標示填錯的格子/)).not.toBeInTheDocument();
  });

  it('shows only the Idiom Crossword setting on the idiom landing page', () => {
    renderAt('/idiom');
    expect(screen.getByRole('button', { name: /成語填字：標示填錯的格子.*ON/ })).toBeInTheDocument();
    expect(screen.queryByText(/highlight 同列同行同宮/)).not.toBeInTheDocument();
    expect(screen.queryByText(/填數字時自動清註記/)).not.toBeInTheDocument();
  });

  it('keeps the catalog wide and exposes all three game cards', () => {
    renderAt('/');
    const main = screen.getByRole('main');
    expect(main).toHaveClass('hub-page');
    expect(within(main).getAllByRole('article')).toHaveLength(3);
  });

  it('uses the shared board frame and exposes Sudoku selection semantically', async () => {
    const user = userEvent.setup();
    renderAt('/play/0?seed=7919');
    const main = screen.getByRole('main');
    expect(main).toHaveClass('game-frame');
    expect(within(main).getByRole('heading', { level: 1 })).toBeInTheDocument();
    const cells = await within(main).findAllByRole('gridcell');
    await user.click(cells[0]);
    expect(cells[0]).toHaveAttribute('aria-selected', 'true');
  });

  it('uses the shared narrow frame for Idiom Crossword gameplay', async () => {
    renderAt('/idiom/play/0?seed=7919');
    const main = screen.getByRole('main');
    expect(main).toHaveClass('game-frame');
    expect(within(main).getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(await within(main).findByRole('grid', { name: /成語填字盤面/ })).toBeInTheDocument();
  });

  it('uses the shared frame and wide stage for Poker gameplay', () => {
    savePokerSnapshot(createNewRun({ seed: 90210, now: 1 }));
    renderAt('/poker/play');
    const main = screen.getByRole('main');
    expect(main).toHaveClass('game-frame');
    expect(within(main).getByRole('heading', { level: 1, name: '小型回合' })).toBeInTheDocument();
    expect(within(main).getByRole('region', { name: '撲克牌桌' })).toHaveClass('game-stage--wide');
  });
});
