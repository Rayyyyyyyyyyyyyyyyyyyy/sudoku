import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('hub and direct game routes preserve Sudoku deep links and recover unknown routes', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  ['/sudoku', '/daily', '/play/:level', '/poker', '/poker/play'].forEach((route) => assert.match(app, new RegExp(`path="${route.replace('/', '\\/')}"`)));
  assert.match(app, /path="\*"[^]*Navigate to="\/" replace/);
});

test('Sudoku storage keys and direct-route implementation remain unchanged', async () => {
  const [session, settings, stats] = await Promise.all([
    readFile(new URL('../src/lib/gameSession.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/settings.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/stats.js', import.meta.url), 'utf8')
  ]);
  assert.match(session, /sudoku-drill-active-game-v2/);
  assert.match(settings, /sudoku-drill-settings-v1/);
  assert.match(stats, /sudoku-drill-v1/);
});

test('portrait poker UI exposes native keyboard controls, state markers, 44px targets, reduced motion, and no page overflow', async () => {
  const [card, game, css] = await Promise.all([
    readFile(new URL('../src/components/PokerCard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/PokerGame.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(card, /aria-pressed/);
  assert.match(card, /已選/);
  assert.match(game, /aria-live="polite"/);
  assert.match(game, /role="status"/);
  assert.match(game, /左移/);
  assert.match(game, /右移/);
  assert.match(game, /presentScoreTrace/);
  assert.match(game, /specialRuleDescription/);
  assert.match(game, /上回合結算/);
  assert.match(game, /還差.*分/);
  assert.match(game, /phaseHeadingRef/);
  assert.doesNotMatch(game, /<code>\{event\.type\}<\/code>/);
  assert.match(css, /min-height:\s*44px/);
  assert.match(css, /min-width:\s*44px/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /pkr-trace__copy/);
  assert.doesNotMatch(css, /pkr-trace li span \{ display:\s*none/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('hub and poker views distinguish active, terminal, and contextual empty states', async () => {
  const [hub, game] = await Promise.all([
    readFile(new URL('../src/pages/GameHub.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/PokerGame.jsx', import.meta.url), 'utf8')
  ]);
  assert.match(hub, /activePoker/);
  assert.match(hub, /terminalPoker/);
  assert.match(hub, /上一局已結束 · 紀錄已保存/);
  assert.match(hub, /terminalPoker \? '查看紀錄'/);
  assert.match(game, /尚無效果牌，可從上方商品取得/);
  assert.match(game, /rarityLabel\(item\.rarity\)/);
});

test('turn choreography source keeps score and settlement in-table with accessible bounded controls', async () => {
  const [card, game, controller, css] = await Promise.all([
    readFile(new URL('../src/components/PokerCard.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/PokerGame.jsx', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/poker/usePokerPresentation.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(game, /pkr-score-stage/);
  assert.match(game, /pkr-card-rail--scoring/);
  assert.match(game, /pkr-live-status[^]*aria-live="polite"/);
  assert.match(game, /略過動畫/);
  assert.match(game, /帶著.*幣前往補給站/);
  assert.match(game, /收下.*幣，完成本局/);
  assert.doesNotMatch(game, /完成計分|領取獎勵/);
  assert.match(game, /focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(game, /scrollIntoView/);
  assert.match(card, /if \(!interactive\) return <li/);
  assert.doesNotMatch(card, /disabled=\{disabled\}/);
  assert.match(card, /新牌/);
  assert.match(controller, /clearTimers/);
  assert.match(controller, /return clearTimers/);
  assert.match(controller, /REDUCED_MOTION_CONTINUATION_MS|scoreSequenceDuration/);
  assert.match(css, /\.pkr-skip[^}]*min-height:\s*44px/);
  assert.match(css, /\.pkr-settle-cta[^}]*min-height:\s*50px/);
  assert.match(css, /\.pkr-card-rail[^}]*overflow-x:\s*auto/);
  assert.match(css, /\.pkr-discard-slot[^}]*min-height/);
  assert.match(css, /\.pkr-score-beats/);
  assert.match(css, /\.pkr-target-progress/);
  assert.match(css, /\.pkr-reward-stage/);
  assert.match(css, /\.pkr-mod\.is-triggered/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[^]*pkr-card\.is-fresh/);
});

test('settlement delegates idempotency to the run reducer without a sticky UI guard', async () => {
  const game = await readFile(new URL('../src/pages/PokerGame.jsx', import.meta.url), 'utf8');
  assert.match(game, /const settleRound = \(\) => dispatch\(\{ type: 'SETTLE_ROUND'/);
  assert.doesNotMatch(game, /settlementCommittedRef\.current/);
  assert.doesNotMatch(game, /settlementCommittedRoundIdRef/);
});

test('round intro only announces a special rule when one is configured', async () => {
  const game = await readFile(new URL('../src/pages/PokerGame.jsx', import.meta.url), 'utf8');
  assert.match(game, /\{rule \? '特殊規則已啟用' : '準備完成'\}/);
  assert.doesNotMatch(game, /round\.type === 'special' \? '特殊規則已啟用'/);
});
