import { fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { POKER_RECORDS_KEY, POKER_SNAPSHOT_KEY, emptyPokerRecords, loadPokerRecords, loadPokerSnapshot } from '../../src/lib/poker/persistence.js';
import { createNewRun, pokerRunReducer } from '../../src/lib/poker/run.js';

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

function renderPoker(path) {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App /><LocationProbe />
  </MemoryRouter>);
}

function failWrites(shouldFail) {
  const original = Storage.prototype.setItem;
  return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (shouldFail(key)) throw new Error('quota exceeded');
    original.call(this, key, value);
  });
}

beforeEach(() => {
  window.matchMedia = vi.fn((media) => ({ matches: true, media, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

describe('poker save recovery', () => {
  it('backs up corrupt records after confirmation and unlocks a terminal run without clearing its snapshot', async () => {
    const state = { ...createNewRun({ seed: 909, now: 1 }), phase: 'run-lost', totalScore: 45 };
    const snapshot = JSON.stringify(state);
    localStorage.setItem(POKER_SNAPSHOT_KEY, snapshot);
    localStorage.setItem(POKER_RECORDS_KEY, '{');
    localStorage.setItem('sudoku-drill-v1', 'keep-sudoku');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    const live = renderPoker('/poker/play');
    expect(screen.getByRole('alert')).toHaveTextContent('牌局紀錄已損壞，可回牌局首頁備份並重建');
    live.unmount();
    renderPoker('/poker');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('牌局紀錄已損壞');
    expect(screen.getByRole('button', { name: '開始牌局' })).toBeDisabled();
    await user.click(within(alert).getByRole('button', { name: '備份並重建紀錄' }));
    expect(localStorage.getItem(POKER_RECORDS_KEY)).toBe('{');
    expect(localStorage.getItem(POKER_SNAPSHOT_KEY)).toBe(snapshot);
    expect(Object.keys(localStorage).some((key) => key.startsWith(`${POKER_RECORDS_KEY}-corrupt-backup`))).toBe(false);

    confirm.mockReturnValue(true);
    await user.click(within(alert).getByRole('button', { name: '備份並重建紀錄' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('歷史成績與收藏'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('原始內容已備份，牌局紀錄已重建。')).toHaveFocus();
    const backupKey = Object.keys(localStorage).find((key) => key.startsWith(`${POKER_RECORDS_KEY}-corrupt-backup`));
    expect(localStorage.getItem(backupKey)).toBe('{');
    expect(localStorage.getItem(POKER_SNAPSHOT_KEY)).toBe(snapshot);
    expect(localStorage.getItem('sudoku-drill-v1')).toBe('keep-sudoku');

    await user.click(screen.getByRole('button', { name: '重試保存牌局紀錄' }));
    expect(loadPokerSnapshot().state.completion.recordsApplied).toBe(true);
    expect(loadPokerRecords().completedRunIds).toEqual([state.runId]);
    await user.click(screen.getByRole('button', { name: '查看紀錄' }));
    expect(screen.getByRole('button', { name: '開始牌局' })).toBeEnabled();
  });

  it.each(['backup', 'records'])('preserves corrupt records if the %s write fails, and allows another recovery attempt', async (failure) => {
    const snapshot = JSON.stringify({ ...createNewRun({ seed: 910, now: 1 }), phase: 'run-lost' });
    localStorage.setItem(POKER_SNAPSHOT_KEY, snapshot);
    localStorage.setItem(POKER_RECORDS_KEY, '{');
    let blocked = true;
    failWrites((key) => blocked && (failure === 'backup' ? key.startsWith(`${POKER_RECORDS_KEY}-corrupt-backup`) : key === POKER_RECORDS_KEY));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    renderPoker('/poker');
    await user.click(screen.getByRole('button', { name: '備份並重建紀錄' }));
    expect(screen.getByRole('alert')).toHaveTextContent('原始紀錄未被清除');
    expect(localStorage.getItem(POKER_RECORDS_KEY)).toBe('{');
    expect(localStorage.getItem(POKER_SNAPSHOT_KEY)).toBe(snapshot);
    blocked = false;
    await user.click(screen.getByRole('button', { name: '備份並重建紀錄' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(loadPokerRecords()).toEqual(emptyPokerRecords());
  });

  it('does not offer corruption recovery for a temporary records read failure', () => {
    const records = JSON.stringify({ ...emptyPokerRecords(), runsWon: 4 });
    localStorage.setItem(POKER_RECORDS_KEY, records);
    const originalGet = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === POKER_RECORDS_KEY) throw new Error('temporarily unavailable');
      return originalGet.call(this, key);
    });
    renderPoker('/poker');
    expect(screen.queryByRole('button', { name: '備份並重建紀錄' })).not.toBeInTheDocument();
    expect(originalGet.call(localStorage, POKER_RECORDS_KEY)).toBe(records);
  });

  it('records a terminal run only once when StrictMode repeats mounted effects', () => {
    const state = { ...createNewRun({ seed: 908, now: 1 }), phase: 'run-lost', totalScore: 44 };
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(state));
    render(<StrictMode><MemoryRouter initialEntries={['/poker/play']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><App /></MemoryRouter></StrictMode>);
    expect(loadPokerRecords().startedRunIds).toEqual([state.runId]);
    expect(loadPokerRecords().completedRunIds).toEqual([state.runId]);
    expect(loadPokerRecords().runsStarted).toBe(1);
    expect(loadPokerSnapshot().state.completion.recordsApplied).toBe(true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([false, true])('keeps the landing page and old data on a failed start (existing run: %s), then retries the same run', async (existing) => {
    const old = existing ? JSON.stringify(createNewRun({ seed: 901, now: 1 })) : null;
    if (old) localStorage.setItem(POKER_SNAPSHOT_KEY, old);
    const records = { ...emptyPokerRecords(), runsStarted: 4, startedRunIds: ['previous'] };
    localStorage.setItem(POKER_RECORDS_KEY, JSON.stringify(records));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    let blocked = true;
    const writes = failWrites((key) => blocked && key === POKER_SNAPSHOT_KEY);
    const user = userEvent.setup();
    renderPoker('/poker');

    await user.click(screen.getByRole('button', { name: existing ? '開始新局' : '開始牌局' }));
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('新局尚未保存');
    expect(screen.getByTestId('location')).toHaveTextContent('/poker');
    expect(localStorage.getItem(POKER_SNAPSHOT_KEY)).toBe(old);
    expect(loadPokerRecords()).toEqual(records);
    const attempted = JSON.parse(writes.mock.calls.find(([key]) => key === POKER_SNAPSHOT_KEY)[1]);

    blocked = false;
    await user.click(within(alert).getByRole('button', { name: '重試保存' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/poker/play');
    expect(loadPokerSnapshot().state.runId).toBe(attempted.runId);
    expect(loadPokerRecords().runsStarted).toBe(5);
    expect(loadPokerRecords().startedRunIds.filter((id) => id === attempted.runId)).toHaveLength(1);
  });

  it('keeps the latest hand selection playable in memory and saves it on retry', async () => {
    const state = pokerRunReducer(createNewRun({ seed: 902, now: 1 }), { type: 'BEGIN_ROUND', now: 2 });
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(state));
    let blocked = true;
    failWrites((key) => blocked && key === POKER_SNAPSHOT_KEY);
    const user = userEvent.setup();
    renderPoker('/poker/play');
    expect(screen.getByRole('alert')).toHaveTextContent('尚未保存');
    const cards = screen.getAllByRole('button', { name: /^[2-9JQKA][♣♦♥♠]/ });
    await user.click(cards[0]);
    await user.click(cards[1]);
    expect(screen.getByRole('button', { name: /出牌 ·/ })).toBeEnabled();
    expect(cards[0]).toHaveAttribute('aria-pressed', 'true');
    expect(cards[1]).toHaveAttribute('aria-pressed', 'true');
    expect(loadPokerSnapshot().state.selection).toEqual([]);

    blocked = false;
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: '重試保存' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('已保存')).toHaveFocus();
    expect(loadPokerSnapshot().state.selection).toHaveLength(2);
    expect(loadPokerSnapshot().state.randomState).toEqual(state.randomState);
  });

  it('keeps a failed completion pending across reload and retries it exactly once from the landing page', async () => {
    const state = { ...createNewRun({ seed: 903, now: 1 }), phase: 'run-lost', roundScore: 42, totalScore: 42 };
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(state));
    let blocked = true;
    failWrites((key) => blocked && key === POKER_RECORDS_KEY);
    const view = renderPoker('/poker/play');
    expect(screen.getByRole('alert')).toHaveTextContent('尚未保存');
    expect(loadPokerSnapshot().state.completion.recordsApplied).toBe(false);
    expect(loadPokerRecords().completedRunIds).toEqual([]);
    view.unmount();

    const landing = renderPoker('/poker');
    expect(screen.getByRole('button', { name: '重試保存牌局紀錄' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始牌局' })).toBeDisabled();
    blocked = false;
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '重試保存牌局紀錄' }));
    expect(loadPokerSnapshot().state.completion.recordsApplied).toBe(true);
    expect(loadPokerRecords().completedRunIds).toEqual([state.runId]);
    expect(loadPokerRecords().highestCompletedScore).toBe(42);
    landing.unmount();
    renderPoker('/poker/play');
    expect(loadPokerRecords().completedRunIds).toEqual([state.runId]);
    expect(loadPokerRecords().runsStarted).toBe(1);
  });

  it('restores focus after retrying a completion and keeps the saved result idempotent', async () => {
    const state = { ...createNewRun({ seed: 905, now: 1 }), phase: 'run-lost', totalScore: 43 };
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(state));
    let blocked = true;
    failWrites((key) => blocked && key === POKER_RECORDS_KEY);
    const user = userEvent.setup();
    renderPoker('/poker/play');
    blocked = false;
    await user.click(within(screen.getByRole('alert')).getByRole('button', { name: '重試保存' }));
    expect(screen.getByText('已保存')).toHaveFocus();
    expect(loadPokerSnapshot().state.completion.recordsApplied).toBe(true);
    expect(loadPokerRecords().completedRunIds).toEqual([state.runId]);
  });

  it('keeps unsaved inputs when leaving is cancelled', async () => {
    const state = pokerRunReducer(createNewRun({ seed: 906, now: 1 }), { type: 'BEGIN_ROUND', now: 2 });
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(state));
    failWrites((key) => key === POKER_SNAPSHOT_KEY);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    renderPoker('/poker/play');
    const card = screen.getAllByRole('button', { name: /^[2-9JQKA][♣♦♥♠]/ })[0];
    await user.click(card);
    await user.click(screen.getByRole('button', { name: '← 牌局首頁' }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('尚未保存'));
    expect(screen.getByTestId('location')).toHaveTextContent('/poker/play');
    expect(card).toHaveAttribute('aria-pressed', 'true');
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: '← 牌局首頁' }));
    expect(screen.getByRole('heading', { name: '通勤牌局' })).toBeInTheDocument();
  });

  it('retries a pending save on the next action without requiring the retry button', async () => {
    const state = pokerRunReducer(createNewRun({ seed: 904, now: 1 }), { type: 'BEGIN_ROUND', now: 2 });
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(state));
    let blocked = true;
    failWrites((key) => blocked && key === POKER_SNAPSHOT_KEY);
    renderPoker('/poker/play');
    expect(screen.getByRole('alert')).toBeInTheDocument();
    blocked = false;
    fireEvent.click(screen.getAllByRole('button', { name: /^[2-9JQKA][♣♦♥♠]/ })[0]);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(loadPokerSnapshot().state.selection).toHaveLength(1);
  });
});
