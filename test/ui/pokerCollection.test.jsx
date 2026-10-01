import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PokerHome from '../../src/pages/PokerHome.jsx';
import PokerGame from '../../src/pages/PokerGame.jsx';
import { MODIFIERS, modifierById } from '../../src/data/poker/compatibility.js';
import { POKER_RECORDS_KEY, POKER_SNAPSHOT_KEY, loadPokerRecords, loadPokerSnapshot } from '../../src/lib/poker/persistence.js';
import { createNewRun, currentRound, pokerRunReducer } from '../../src/lib/poker/run.js';

function renderPoker(path = '/poker') {
  return render(<MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Routes><Route path="/poker" element={<PokerHome />} /><Route path="/poker/play" element={<PokerGame />} /></Routes>
  </MemoryRouter>);
}

function shopState() {
  let state = createNewRun({ seed: 960, now: 1 });
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 2 });
  state = { ...state, roundScore: currentRound(state).target - 1, totalScore: currentRound(state).target - 1 };
  state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: 3 });
  state = pokerRunReducer(state, { type: 'PLAY', now: 4 });
  state = pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: 5 });
  state = pokerRunReducer(state, { type: 'SETTLE_ROUND', now: 6 });
  return { ...state, coins: 100 };
}

beforeEach(() => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});

describe('permanent poker collection', () => {
  it('shows an empty collection for legacy records without changing an active run or statistics', async () => {
    const legacy = { runsStarted: 12, runsWon: 5, highestCompletedScore: 12345, winStreak: 2, startedRunIds: ['old'], completedRunIds: ['old'] };
    const snapshot = JSON.stringify(createNewRun({ seed: 961, now: 1 }));
    localStorage.setItem(POKER_RECORDS_KEY, JSON.stringify(legacy));
    localStorage.setItem(POKER_SNAPSHOT_KEY, snapshot);
    const user = userEvent.setup();
    renderPoker();

    const collection = screen.getByRole('region', { name: '效果牌收藏' });
    expect(within(collection).getByText(`已發現 0 / ${MODIFIERS.length}`)).toBeInTheDocument();
    expect(within(collection).getByText('下一收藏目標：找到第 1 種效果牌。')).toBeInTheDocument();
    await user.click(within(collection).getByText('查看效果牌圖鑑'));
    expect(within(collection).getAllByText('尚未發現')).toHaveLength(MODIFIERS.length);
    expect(within(collection).queryByText(MODIFIERS[0].display.name)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '繼續牌局' })).toBeEnabled();
    expect(localStorage.getItem(POKER_RECORDS_KEY)).toBe(JSON.stringify(legacy));
    expect(localStorage.getItem(POKER_SNAPSHOT_KEY)).toBe(snapshot);
  });

  it('records a purchased effect through the mounted hook and keeps it after selling, losing, and starting again', async () => {
    const shop = shopState();
    const offer = shop.offers.items.find((item) => item.type === 'modifier');
    const item = modifierById(offer.itemId);
    const otherGames = { 'sudoku-drill-v1': '{"count":5}', 'unrelated-records': '{"wins":2}', 'unrelated-progress': 'keep' };
    Object.entries(otherGames).forEach(([key, value]) => localStorage.setItem(key, value));
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(shop));
    const user = userEvent.setup();
    renderPoker('/poker/play');

    const product = screen.getByRole('heading', { name: item.display.name }).closest('article');
    await user.click(within(product).getByRole('button'));
    expect(loadPokerRecords().discoveredModifierIds).toEqual([item.id]);
    expect(screen.getByText(`圖鑑新增：${item.display.name}`)).toBeVisible();
    const owned = screen.getByText(item.display.name, { selector: '.pkr-mod b' }).closest('article');
    await user.click(within(owned).getByRole('button', { name: /出售/ }));
    expect(loadPokerSnapshot().state.modifiers).toEqual([]);
    expect(loadPokerRecords().discoveredModifierIds).toEqual([item.id]);

    await user.click(screen.getByRole('button', { name: '下一回合 →' }));
    await user.click(screen.getByRole('button', { name: '開始回合' }));
    for (let hand = 0; hand < 4; hand += 1) {
      await user.click(screen.getAllByRole('button', { name: /^[2-9JQKA][♣♦♥♠]/ })[0]);
      await user.click(screen.getByRole('button', { name: /出牌 ·/ }));
      await user.click(screen.getByRole('button', { name: '略過動畫' }));
    }
    expect(screen.getByRole('heading', { name: '本局結束' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '查看紀錄' }));
    let collection = screen.getByRole('region', { name: '效果牌收藏' });
    expect(within(collection).getByText(`已發現 1 / ${MODIFIERS.length}`)).toBeInTheDocument();
    expect(within(collection).getByText('收藏跨局保留；每局效果仍於牌局中取得。')).toBeInTheDocument();
    await user.click(within(collection).getByText('查看效果牌圖鑑'));
    await user.click(within(collection).getByText(item.display.name));
    expect(within(collection).getByText(item.display.description)).toBeVisible();
    expect(within(collection).getAllByText('尚未發現')).toHaveLength(MODIFIERS.length - 1);

    await user.click(screen.getByRole('button', { name: '開始牌局' }));
    expect(loadPokerSnapshot().state.modifiers).toEqual([]);
    expect(loadPokerRecords().discoveredModifierIds).toEqual([item.id]);
    await user.click(screen.getByRole('button', { name: '← 牌局首頁' }));
    collection = screen.getByRole('region', { name: '效果牌收藏' });
    expect(within(collection).getByText(`已發現 1 / ${MODIFIERS.length}`)).toBeInTheDocument();
    expect(within(collection).getByText('下一收藏目標：找到第 2 種效果牌。')).toBeInTheDocument();
    Object.entries(otherGames).forEach(([key, value]) => expect(localStorage.getItem(key)).toBe(value));
  });

  it('does not announce a permanent discovery when its records cannot be saved', async () => {
    const shop = shopState();
    const offer = shop.offers.items.find((item) => item.type === 'modifier');
    const item = modifierById(offer.itemId);
    localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(shop));
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === POKER_RECORDS_KEY) throw new Error('quota exceeded');
      originalSetItem.call(this, key, value);
    });
    const user = userEvent.setup();
    renderPoker('/poker/play');
    const product = screen.getByRole('heading', { name: item.display.name }).closest('article');
    await user.click(within(product).getByRole('button'));
    expect(loadPokerSnapshot().state.modifiers.map((owned) => owned.catalogId)).toEqual([item.id]);
    expect(loadPokerRecords().discoveredModifierIds).toEqual([]);
    expect(screen.queryByText(`圖鑑新增：${item.display.name}`)).not.toBeInTheDocument();
  });
});
