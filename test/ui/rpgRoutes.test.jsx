import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../src/App.jsx';
import { createGame, getOmen, loadGame, STORAGE_KEY, transition } from '../../src/lib/rpg/index.ts';
import { V1_FIXTURES } from '../rpg/fixtures/v1.ts';

function renderRpg(path = '/rpg') { return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>); }

describe('RPG story reader', () => {
  it('bundles the pixel atlas locally and exposes class artwork accessibly', () => {
    renderRpg();
    const atlas = screen.getByRole('img', { name: /十六格像素圖鑑/ });
    expect(atlas).toHaveAttribute('src', '/assets/rpg-pixel-atlas.png');
    expect(screen.getByRole('img', { name: '戰士像素圖' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '法師像素圖' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '遊俠像素圖' })).toBeInTheDocument();
  });

  it('opens from the hub, makes a choice, and resumes the exact scene after remount', async () => {
    const user = userEvent.setup();
    const page = renderRpg('/');
    await user.click(screen.getByRole('button', { name: /進入夢魘堡壘/ }));
    await user.click(screen.getByRole('radio', { name: /法師/ }));
    await user.click(screen.getByRole('button', { name: '開始遠征' }));
    expect(screen.getByRole('heading', { name: '第三個沒有夢醒的清晨' })).toBeInTheDocument();
    expect(screen.getByText(getOmen(1066).description)).toBeInTheDocument();
    expect(screen.getByText(/本趟探索 1 \/ /)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /聽法師說明夢魘/ }));
    const saved = loadGame(localStorage);
    expect(saved.status).toBe('ok');
    expect(saved.state.run.hero.classId).toBe('mage');
    expect(saved.state.run.nodeId).toBe('briefing');
    page.unmount();
    renderRpg();
    expect(screen.getByRole('heading', { name: '唯一能穿過夢的鋼' })).toBeInTheDocument();
    expect(loadGame(localStorage)).toEqual(saved);
  });

  it('shows the expanded permanent progression choices before departure', () => {
    renderRpg();
    expect(screen.getByRole('button', { name: /百鍛刃口/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /黑雨煉金術/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /失落路圖/ })).toBeInTheDocument();
    expect(screen.getByText(/已解鎖養成 0 \/ 6/)).toBeInTheDocument();
  });

  it('renders specialization, relic tradeoffs, an ending and the recovery panels from valid saved states', async () => {
    const user = userEvent.setup();
    const started = transition(createGame(), { type: 'start', classId: 'warrior', seed: 17, revision: 0 }).state;
    const build = structuredClone(started);
    build.run.nodeId = 'outfitter';
    build.run.visited.push('forge', 'outfitter');
    build.run.specialization = 'warrior-riposte';
    build.run.hero.inventory.push('covenant-knot');
    localStorage.setItem(STORAGE_KEY, JSON.stringify(build));
    const page = renderRpg();
    expect(screen.getByText(/專精：反擊/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: '裝備遺物（戰鬥外）' })).toHaveTextContent(/格擋額外減傷 3.*普通攻擊傷害 -2/);
    await user.click(screen.getByRole('radio', { name: /盟約繩結/ }));
    expect(loadGame(localStorage).state.run.equippedRelic).toBe('covenant-knot');

    page.unmount();
    const ended = structuredClone(build);
    ended.run.nodeId = 'fever-dawn';
    ended.run.phase = 'ended';
    ended.run.visited.push('fever-dawn');
    ended.profile.victories = 1;
    ended.profile.tales = ['fever-account'];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ended));
    renderRpg();
    expect(screen.getByRole('heading', { name: '第三夜的熱終於退了' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '準備出發' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '第三夜的熱病' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再次遠征' })).toBeInTheDocument();
  });

  it('enforces class-specific choices and shows combat intent with actionable controls', async () => {
    const user = userEvent.setup();
    renderRpg();
    for (const name of ['開始遠征', /聽法師/, /帶上乾糧/, /走木橋/]) await user.click(screen.getByRole('button', { name }));
    expect(screen.getByRole('button', { name: /沿河找/ })).toBeDisabled();
    for (const name of [/確認方向/, /削一根/]) await user.click(screen.getByRole('button', { name }));
    const eventChoices = within(screen.getByRole('region', { name: '故事選擇' })).getAllByRole('button');
    await user.click(eventChoices.find(button => !button.disabled));
    for (const name of [/追蹤巨獸/, /迎戰鐵脊/]) await user.click(screen.getByRole('button', { name }));
    const combat = screen.getByRole('region', { name: '當前戰鬥' });
    expect(within(combat).getByText(/張口蓄勢/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /破甲重擊/ }));
    expect(within(combat).getByText(/橫掃尾擊/)).toBeInTheDocument();
    expect(loadGame(localStorage).state.run.battle.round).toBe(2);
  });

  it('keeps incompatible saves untouched until an explicit confirmed reset', async () => {
    const user = userEvent.setup();
    localStorage.setItem(STORAGE_KEY, '{"schemaVersion":999}');
    renderRpg();
    expect(screen.getByRole('heading', { name: '這份存檔目前無法讀取' })).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"schemaVersion":999}');
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: /重建這款/ }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{"schemaVersion":999}');
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /重建這款/ }));
    expect(screen.getByRole('button', { name: '開始遠征' })).toBeInTheDocument();
    expect(loadGame(localStorage).status).toBe('ok');
  });

  it('previews a legal v1 save and migrates only after explicit confirmation', async () => {
    const user = userEvent.setup();
    const raw = JSON.stringify(V1_FIXTURES.upgraded);
    localStorage.setItem(STORAGE_KEY, raw);
    renderRpg();
    expect(screen.getByRole('heading', { name: '舊版遠征需要確認轉換' })).toBeInTheDocument();
    expect(screen.getByText(/養成 6 項/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: /確認保留成果並轉換/ }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /確認保留成果並轉換/ }));
    expect(screen.getByRole('heading', { name: '準備出發' })).toBeInTheDocument();
    const loaded = loadGame(localStorage);
    expect(loaded.status).toBe('ok');
    expect(loaded.state).toMatchObject({ schemaVersion: 2, revision: V1_FIXTURES.upgraded.revision + 1, run: null,
      profile: { upgrades: V1_FIXTURES.upgraded.profile.upgrades, discoveries: V1_FIXTURES.upgraded.profile.discoveries, tales: [] } });
  });

  it('keeps a v1 migration pending and does not claim success when its single write fails', async () => {
    const user = userEvent.setup();
    const raw = JSON.stringify(V1_FIXTURES.combat);
    localStorage.setItem(STORAGE_KEY, raw);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota'); });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderRpg();
    await user.click(screen.getByRole('button', { name: /確認保留成果並轉換/ }));
    expect(screen.getByRole('heading', { name: '舊版遠征需要確認轉換' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/轉換尚未保存/);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw);
  });

  it('never overwrites an existing save after a transient read failure', async () => {
    const user = userEvent.setup();
    const original = '{"precious":"existing progress"}';
    localStorage.setItem(STORAGE_KEY, original);
    const getItem = Storage.prototype.getItem;
    let failNextRpgRead = true;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function (key) {
      if (key === STORAGE_KEY && failNextRpgRead) {
        failNextRpgRead = false;
        throw Error('temporary read failure');
      }
      return getItem.call(this, key);
    });
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    renderRpg();
    expect(screen.getByText(/已停止寫入以保護既有進度/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '開始遠征' }));
    await user.click(screen.getByRole('button', { name: /聽法師/ }));
    expect(writes.mock.calls.filter(([key]) => key === STORAGE_KEY)).toHaveLength(0);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(original);
  });

  it('keeps play available and visibly reports a storage write failure', async () => {
    const user = userEvent.setup();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('quota'); });
    renderRpg();
    expect(screen.getByText(/目前無法寫入本機/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '開始遠征' }));
    expect(screen.getByRole('heading', { name: '第三個沒有夢醒的清晨' })).toBeInTheDocument();
  });

  it('rejects invalid journey numbers and requires confirmation before retreating', async () => {
    const user = userEvent.setup();
    renderRpg();
    fireEvent.change(screen.getByLabelText('旅程編號'), { target: { value: '-1' } });
    expect(screen.getByRole('button', { name: '開始遠征' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('旅程編號'), { target: { value: '22' } });
    await user.click(screen.getByRole('button', { name: '開始遠征' }));
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await user.click(screen.getByRole('button', { name: /撤離遠征，返回村莊/ }));
    expect(loadGame(localStorage).state.run.phase).toBe('story');
    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: /撤離遠征，返回村莊/ }));
    expect(screen.getByRole('heading', { name: '帶著路線回家' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '再次遠征' })).toBeInTheDocument();
  });
});
