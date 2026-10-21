import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import App from '../../src/App.jsx';
import GameHub from '../../src/pages/GameHub.jsx';
import { emptyStats, persistStats } from '../../src/lib/stats.js';
import { emptyPokerRecords, POKER_RECORDS_KEY, POKER_SNAPSHOT_KEY } from '../../src/lib/poker/persistence.js';
import { createNewRun } from '../../src/lib/poker/run.js';
import { MODIFIERS } from '../../src/data/poker/compatibility.js';

function storageSnapshot() {
  return Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)]));
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe('game hub collection progress', () => {
  it('routes pending terminal records back to the poker table without claiming they were saved', async () => {
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify({ ...createNewRun({ seed: 907, now: 1 }), phase: 'run-lost' }));
    render(<MemoryRouter><App /><LocationProbe /></MemoryRouter>);
    expect(screen.getByText('上一局已結束 · 紀錄待保存')).toBeInTheDocument();
    expect(screen.queryByText('上一局已結束 · 紀錄已保存')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '重試保存牌局紀錄 →' }));
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/poker/play'));
    expect(screen.getByRole('heading', { name: '本局結束' })).toBeInTheDocument();
  });

  it('reads available games’ permanent progress without awarding or modifying data', () => {
    persistStats({ ...emptyStats(), solved: 5, count: { 4: 5 } });
    localStorage.setItem(POKER_RECORDS_KEY, JSON.stringify({ ...emptyPokerRecords(), discoveredModifierIds: [MODIFIERS[0].id] }));
    const before = storageSnapshot();

    render(<MemoryRouter><GameHub /></MemoryRouter>);
    expect(screen.getByText('解題徽章 2 / 18')).toBeInTheDocument();
    expect(screen.getByText(`效果牌圖鑑 1 / ${MODIFIERS.length}`)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /進入|繼續/ })).toHaveLength(2);
    expect(screen.queryByText('成語填字')).not.toBeInTheDocument();
    expect(screen.queryByText('夢魘堡壘')).not.toBeInTheDocument();
    expect(storageSnapshot()).toEqual(before);
  });

  it.each(['/idiom', '/idiom/play/0', '/idiom/daily', '/rpg'])('returns retired route %s to the two-game hub', async (route) => {
    render(<MemoryRouter initialEntries={[route]}><App /><LocationProbe /></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
    expect(screen.getByRole('heading', { name: '通勤遊戲櫃' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '成語填字' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '夢魘堡壘' })).not.toBeInTheDocument();
  });

  it('drops removed-game settings while retaining Sudoku preferences', async () => {
    localStorage.setItem('sudoku-drill-settings-v1', JSON.stringify({
      showErrors: false,
      highlightPeers: true,
      autoCleanNotes: false,
      idiomShowErrors: false
    }));
    render(<MemoryRouter><App /></MemoryRouter>);
    await waitFor(() => expect(JSON.parse(localStorage.getItem('sudoku-drill-settings-v1'))).toEqual({
      showErrors: false,
      highlightPeers: true,
      autoCleanNotes: false
    }));
  });
});
