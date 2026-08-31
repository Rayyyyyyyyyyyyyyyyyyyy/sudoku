import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { MODIFIERS, modifierById, packById } from '../../src/data/poker/compatibility.js';
import { shopOfferCost } from '../../src/lib/poker/economy.js';
import {
  POKER_RECORDS_KEY,
  POKER_SNAPSHOT_KEY,
  emptyPokerRecords
} from '../../src/lib/poker/persistence.js';
import { REDUCED_MOTION_CONTINUATION_MS } from '../../src/lib/poker/presentation.js';
import { addTestModifier, createNewRun, currentRound, pokerRunReducer } from '../../src/lib/poker/run.js';

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderApp(path = '/poker/play') {
  return render(
    <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  );
}

function storeSnapshot(state) {
  localStorage.setItem(POKER_SNAPSHOT_KEY, JSON.stringify(state));
}

function forceRoundWon(state, now = 2) {
  state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now });
  const scoreBeforePlay = currentRound(state).target - 1;
  state = { ...state, roundScore: scoreBeforePlay, totalScore: state.totalScore + scoreBeforePlay };
  state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: now + 1 });
  state = pokerRunReducer(state, { type: 'PLAY', now: now + 2 });
  return pokerRunReducer(state, { type: 'FINISH_RESOLUTION', now: now + 3 });
}

function createShop(seed = 500, state = createNewRun({ seed, now: 1 })) {
  const won = forceRoundWon(state);
  return pokerRunReducer(won, { type: 'SETTLE_ROUND', now: 6 });
}

function mediaQuery(matches = false) {
  return vi.fn().mockImplementation((query) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }));
}

beforeEach(() => {
  window.matchMedia = mediaQuery(false);
  vi.spyOn(HTMLElement.prototype, 'focus');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('poker route recovery boundary', () => {
  it('redirects an empty play route to the poker landing page', async () => {
    renderApp();
    expect(await screen.findByRole('heading', { name: '通勤牌局' })).toBeInTheDocument();
    expect(screen.getByTestId('location')).toHaveTextContent('/poker');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    ['malformed', '{not-json'],
    ['version-incompatible', JSON.stringify({ ...createNewRun({ seed: 501, now: 1 }), schemaVersion: 99 })]
  ])('shows recoverable copy for a %s save and clears only the active run', async (_label, raw) => {
    const records = { ...emptyPokerRecords(), runsStarted: 4, runsWon: 2, startedRunIds: ['kept-run'] };
    localStorage.setItem(POKER_SNAPSHOT_KEY, raw);
    localStorage.setItem(POKER_RECORDS_KEY, JSON.stringify(records));
    const user = userEvent.setup();
    renderApp();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('舊牌局無法安全續玩');
    expect(alert).toHaveTextContent('個人紀錄仍保留');
    expect(screen.getByText('4')).toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: '清除舊牌局，再開始' }));
    expect(localStorage.getItem(POKER_SNAPSHOT_KEY)).toBeNull();
    expect(JSON.parse(localStorage.getItem(POKER_RECORDS_KEY))).toEqual(records);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps a valid active run on the play route', async () => {
    storeSnapshot(createNewRun({ seed: 502, now: 1 }));
    renderApp();
    expect(await screen.findByRole('heading', { name: '小型回合' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '開始回合' })).toBeEnabled();
    expect(screen.getByTestId('location')).toHaveTextContent('/poker/play');
  });
});

describe('mounted poker play behavior', () => {
  it('exposes disabled reasons, resolves a committed score, and restores focus after skip', async () => {
    let state = createNewRun({ seed: 510, now: 1 });
    state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 2 });
    state = { ...state, actions: { ...state.actions, discards: 0 } };
    storeSnapshot(state);
    const user = userEvent.setup();
    renderApp();

    const play = await screen.findByRole('button', { name: /出牌 ·/ });
    const discard = screen.getByRole('button', { name: /棄牌 ·/ });
    expect(play).toBeDisabled();
    expect(discard).toBeDisabled();
    expect(screen.getByText('請先選擇 1–5 張牌。')).toBeInTheDocument();

    const card = screen.getAllByRole('button', { name: /^[2-9JQKA][♣♦♥♠]/ })[0];
    await user.click(card);
    expect(play).toBeEnabled();
    expect(discard).toBeDisabled();
    expect(screen.getByText('棄牌次數已用完')).toBeInTheDocument();

    await user.click(play);
    expect(await screen.findByRole('heading', { name: '高牌' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/高牌，本手獲得 \d+ 分/);
    await user.click(screen.getByRole('button', { name: '略過動畫' }));
    await screen.findByText('0 張已選');
    await waitFor(() => expect(document.activeElement).toHaveClass('pkr-card'));
  });

  it('uses catalog pricing for legacy offers and enforces affordability', async () => {
    const shop = createShop(520);
    const offer = shop.offers.items[0];
    const authoritativeCost = shopOfferCost(offer, shop.completion.settledRoundIds.length);
    storeSnapshot({
      ...shop,
      coins: authoritativeCost - 1,
      offers: { ...shop.offers, items: shop.offers.items.map((item) => ({ ...item, cost: 0 })) }
    });
    renderApp();

    expect(await screen.findByRole('heading', { name: '補給站' })).toBeInTheDocument();
    const item = offer.type === 'modifier' ? modifierById(offer.itemId) : packById(offer.itemId);
    const article = screen.getByRole('heading', { name: item.display.name }).closest('article');
    expect(within(article).getByRole('button')).toHaveTextContent(`${authoritativeCost} 幣取得`);
    expect(within(article).getByRole('button')).toBeDisabled();
  });

  it('enforces inventory capacity and excludes owned modifiers from shop and pack choices', async () => {
    let base = addTestModifier(createNewRun({ seed: 521, now: 1 }), 'all-face-classifier');
    let shop = createShop(521, base);
    const offeredModifierIds = new Set(shop.offers.items.filter((offer) => offer.type === 'modifier').map((offer) => offer.itemId));
    expect(offeredModifierIds.has('all-face-classifier')).toBe(false);

    const extra = MODIFIERS
      .filter((item) => item.id !== 'all-face-classifier' && !offeredModifierIds.has(item.id))
      .slice(0, 5)
      .map((item, index) => ({ instanceId: `capacity-${index}-${item.id}`, catalogId: item.id, counters: {} }));
    storeSnapshot({ ...shop, coins: 100, modifiers: [...shop.modifiers, ...extra] });
    const first = renderApp();
    expect(await screen.findByRole('heading', { name: '補給站' })).toBeInTheDocument();
    shop.offers.items.filter((offer) => offer.type === 'modifier').forEach((offer) => {
      const article = screen.getByRole('heading', { name: modifierById(offer.itemId).display.name }).closest('article');
      expect(within(article).getByRole('button', { name: '欄位已滿' })).toBeDisabled();
    });
    first.unmount();

    shop = { ...shop, coins: 100 };
    const packOffer = shop.offers.items.find((offer) => offer.type === 'pack');
    const pack = pokerRunReducer(shop, { type: 'BUY_OFFER', offerId: packOffer.offerId, transactionId: 'mounted-pack', now: 8 });
    expect(pack.packState.choices.some((choice) => choice.itemId === 'all-face-classifier')).toBe(false);
    storeSnapshot(pack);
    const user = userEvent.setup();
    renderApp();
    expect(await screen.findByRole('heading', { name: packById(packOffer.itemId).display.name })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '略過並返回商店' }));
    const shopHeading = await screen.findByRole('heading', { name: '補給站' });
    await waitFor(() => expect(shopHeading).toHaveFocus());
    const purchasedPack = screen.getByRole('heading', { name: packById(packOffer.itemId).display.name }).closest('article');
    expect(within(purchasedPack).getByRole('button', { name: '已取得' })).toBeDisabled();
  });

  it('completes reduced-motion resolution within the bounded continuation and keeps status comprehensible', async () => {
    vi.useFakeTimers();
    window.matchMedia = mediaQuery(true);
    let state = createNewRun({ seed: 530, now: 1 });
    state = pokerRunReducer(state, { type: 'BEGIN_ROUND', now: 2 });
    state = pokerRunReducer(state, { type: 'TOGGLE_CARD', cardId: state.zones.hand[0].instanceId, now: 3 });
    state = pokerRunReducer(state, { type: 'PLAY', now: 4 });
    storeSnapshot(state);
    renderApp();

    expect(screen.getByRole('main')).toHaveClass('is-reduced-motion');
    expect(screen.getByRole('status')).toHaveTextContent(/本手獲得 \d+ 分/);
    await act(async () => {
      vi.advanceTimersByTime(REDUCED_MOTION_CONTINUATION_MS);
    });
    expect(screen.getByText('0 張已選')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/本手獲得 \d+ 分/);
  });
});
