import { useEffect, useReducer, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CLASS_IDS, CLASSES, DISCOVERY_IDS, ENEMIES, ITEMS, NODES, SOURCE, UPGRADES,
  createGame, getAvailableActions, getOmen, loadGame, saveGame, transition,
} from '../lib/rpg/index.ts';
import './rpg.css';

const PIXEL_ATLAS = `${import.meta.env.BASE_URL}assets/rpg-pixel-atlas.png`;
const CLASS_SPRITES = { warrior: 0, mage: 1, ranger: 2 };
const ENEMY_SPRITES = { crocodile: 4, spider: 5, guardian: 6, gaznak: 7, wraith: 3, knight: 0, wolf: 12 };
const ITEM_SPRITES = { potion: 13, ward: 3, sacnoth: 0, ember: 10, iron: 11, moonstone: 9, bell: 8 };

function PixelIcon({ cell, label, size = 'normal' }) {
  const x = (cell % 4) * (100 / 3);
  const y = Math.floor(cell / 4) * (100 / 3);
  return <span className={`rpg-pixel-icon is-${size}`} role="img" aria-label={label} style={{ backgroundImage: `url(${PIXEL_ATLAS})`, backgroundPosition: `${x}% ${y}%` }} />;
}

function storage() {
  try { return window.localStorage; } catch { return null; }
}

function initialize() {
  const saved = loadGame(storage());
  return {
    game: saved.status === 'ok' ? saved.state : createGame(),
    blocked: saved.status === 'incompatible' ? saved.raw : null,
    readUnavailable: saved.status === 'unavailable',
    message: '',
  };
}

function reducer(model, action) {
  if (action.type === 'reset-save') return { game: createGame(), blocked: null, readUnavailable: false, message: '已重建夢魘堡壘存檔。' };
  if (model.blocked !== null) return model;
  const result = transition(model.game, action);
  return { ...model, game: result.state, message: result.accepted ? '' : result.reason };
}

export default function RpgGame() {
  const [model, dispatch] = useReducer(reducer, undefined, initialize);
  const [classId, setClassId] = useState('warrior');
  const [seed, setSeed] = useState('1066');
  const [saveError, setSaveError] = useState(false);
  const heading = useRef(null);
  const { game, blocked, readUnavailable } = model;
  const run = game.run;
  const active = run && run.phase !== 'ended';
  const node = run ? NODES[run.nodeId] : null;
  const enemy = run?.battle ? ENEMIES[run.battle.enemyId] : null;
  const omen = run ? getOmen(run.seed) : null;
  const options = getAvailableActions(game);
  const storyNodeCount = Object.values(NODES).filter(entry => !entry.ending).length;

  useEffect(() => {
    if (blocked !== null || readUnavailable) return;
    setSaveError(!saveGame(game, storage()));
  }, [game, blocked, readUnavailable]);

  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [run?.nodeId, run?.phase]);

  function send(action) { dispatch({ ...action, revision: game.revision }); }
  function retreat(action = { type: 'retreat' }) {
    if (window.confirm('撤離會結束這趟遠征，保留永久見聞與村莊養成。確定返回嗎？')) send(action);
  }
  const numericSeed = Number(seed);
  const seedValid = /^\d+$/.test(seed) && Number.isInteger(numericSeed) && numericSeed >= 0 && numericSeed <= 0xffffffff;

  return (
    <main className="rpg-page">
      <header className="rpg-header">
        <Link to="/">← 遊戲櫃</Link>
        <span>文字冒險 · 劍與魔法</span>
      </header>
      <div className="rpg-title">
        <p className="rpg-eyebrow">THE NIGHTMARE FORTRESS</p>
        <h1>夢魘堡壘</h1>
        <p>帶一把劍穿過黑夜，把能教給下一個人的事帶回來。</p>
      </div>

      {blocked !== null ? (
        <section className="rpg-panel" aria-labelledby="rpg-recovery-title">
          <h2 id="rpg-recovery-title">這份存檔目前無法讀取</h2>
          <p>內容版本不同或資料不完整。原始資料仍保留，尚未覆寫。</p>
          <details><summary>查看原始存檔以便備份</summary><textarea aria-label="原始存檔" readOnly value={blocked} rows={6} /></details>
          <button type="button" onClick={() => {
            if (window.confirm('只重建夢魘堡壘的存檔，會清除其遠征與永久養成。其他遊戲不受影響。確定嗎？')) dispatch({ type: 'reset-save' });
          }}>重建這款遊戲的存檔</button>
        </section>
      ) : <>
        <p className={`rpg-save ${saveError || readUnavailable ? 'rpg-warning' : ''}`} role="status">
          {readUnavailable ? '目前無法讀取本機存檔，已停止寫入以保護既有進度。可暫時遊玩但不會儲存；請重新載入頁面以重試讀取。' : saveError ? '目前無法寫入本機。這次仍可遊玩，但關閉頁面可能失去進度。' : '進度已儲存在本機 · 離開頁面後可繼續'}
        </p>
        {model.message && <p role="alert">{model.message}</p>}

        {run && <>
          <section className="rpg-panel rpg-character" aria-label="角色狀態">
            <div className="rpg-character-heading">
              <strong>{CLASSES[run.hero.classId].name} · 等級 {run.hero.level}</strong>
              <span>旅程 {run.seed} · {omen.name}</span>
            </div>
            <dl className="rpg-stats">
              <div><dt>生命</dt><dd>{run.hero.hp} / {run.hero.maxHp}</dd></div>
              <div><dt>魔力</dt><dd>{run.hero.mana} / {run.hero.maxMana}</dd></div>
              <div><dt>金幣</dt><dd>{run.hero.gold}</dd></div>
              <div><dt>補給</dt><dd>{run.hero.supplies}</dd></div>
            </dl>
            <p className="rpg-omen"><PixelIcon cell={3} label="月色異象" size="small" /><strong>{omen.name}</strong><span>{omen.description}</span></p>
            <p className="rpg-progress">本趟探索 {run.visited.filter(id => !NODES[id].ending).length} / {storyNodeCount} 節 · 累積發現 {game.profile.discoveries.length}</p>
            <small>{run.hero.level < 4 ? `升級經驗 ${run.hero.xp} / ${run.hero.level * 6}` : '已達本篇等級上限'} · 升級會提升能力並恢復部分狀態</small>
          </section>

          <article className="rpg-panel rpg-story" aria-labelledby="rpg-scene-title">
            <p className="rpg-eyebrow">{node.act}</p>
            <h2 id="rpg-scene-title" ref={heading} tabIndex={-1}>{node.title}</h2>
            {node.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
            {node.variants?.filter(v => run.flags.includes(v.flag)).map(v => <p className="rpg-consequence" key={v.flag}>{v.text}</p>)}
          </article>

          {enemy && <section className="rpg-panel rpg-enemy" aria-label="當前戰鬥">
            <p className="rpg-eyebrow">第 {run.battle.round} 回合</p>
            <h2 className="rpg-icon-heading"><PixelIcon cell={ENEMY_SPRITES[enemy.id]} label={`${enemy.name}像素圖`} />{enemy.name}</h2>
            <p>{enemy.description}</p>
            <p>敵方生命 {run.battle.hp} / {enemy.hp} · 護甲 {enemy.intents[run.battle.intent].exposed ? 0 : enemy.armor}</p>
            <p className="rpg-intent"><strong>敵方意圖：</strong>{enemy.intents[run.battle.intent].label}</p>
            <small>傷害標示為減傷前數值。每次行動後敵人反擊；致勝一擊不會受到反擊。</small>
          </section>}

          {active && <section className="rpg-choices" aria-label={enemy ? '戰鬥行動' : '故事選擇'}>
            {options.map(option => <button key={option.id} type="button" disabled={option.disabled} onClick={() => {
              const action = { type: enemy ? 'combat' : 'choose', id: option.id };
              if (option.id === 'flee') retreat(action); else send(action);
            }}>
              <strong>{option.label}</strong>
              <span>{option.detail}</span>
              {option.disabled && <span className="rpg-requirement">{option.reason}</span>}
            </button>)}
          </section>}

          <section className="rpg-panel rpg-journal" aria-label="背包與行動記錄">
            <details>
              <summary>背包 · {run.hero.inventory.length} 件物品</summary>
              {Object.entries(ITEMS).filter(([id]) => run.hero.inventory.includes(id)).map(([id, item]) => <p className="rpg-item" key={id}><PixelIcon cell={ITEM_SPRITES[id]} label={`${item.name}像素圖`} size="small" /><span><strong>{item.name} ×{run.hero.inventory.filter(v => v === id).length}</strong><br />{item.description}</span></p>)}
            </details>
            <details>
              <summary>最近行動</summary>
              <ol>{run.log.map((entry, index) => <li key={`${index}-${entry}`}>{entry}</li>)}</ol>
            </details>
            <p className="rpg-live" aria-live="polite" aria-atomic="true">{run.log.at(-1)}</p>
          </section>
          {active && <button className="rpg-retreat" type="button" onClick={() => retreat()}>撤離遠征，返回村莊</button>}
        </>}

        {!active && <>
          <section className="rpg-panel" aria-labelledby="rpg-preparation">
            <h2 id="rpg-preparation">準備出發</h2>
            <p>一段可從村莊走到終戰的短篇冒險。選擇職業，觀察敵方招式，帶回見聞讓村莊成長。</p>
            <figure className="rpg-pixel-atlas">
              <img src={PIXEL_ATLAS} alt="劍、法杖、弓、怪物、符文與堡壘組成的十六格像素圖鑑" width="1254" height="1254" />
              <figcaption>旅途中可能遇見的武器、怪物與夢城遺物</figcaption>
            </figure>
            <fieldset className="rpg-classes"><legend>選擇職業</legend>
              {CLASS_IDS.map(id => <label key={id} className={classId === id ? 'is-selected' : ''}>
                <input type="radio" name="rpg-class" value={id} checked={classId === id} onChange={() => setClassId(id)} />
                <PixelIcon cell={CLASS_SPRITES[id]} label={`${CLASSES[id].name}像素圖`} />
                <span><strong>{CLASSES[id].name}</strong><small>{CLASSES[id].description}</small></span>
              </label>)}
            </fieldset>
            <label className="rpg-seed">旅程編號
              <input value={seed} onChange={e => setSeed(e.target.value)} inputMode="numeric" aria-invalid={!seedValid} aria-describedby="rpg-seed-help" />
            </label>
            <small id="rpg-seed-help">輸入 0～4294967295。同一編號、配置與選擇可重現結果。</small>
            <button className="rpg-primary" type="button" disabled={!seedValid} onClick={() => {
              send({ type: 'start', classId, seed: numericSeed });
              setSeed(String((numericSeed + 1) >>> 0));
            }}>{run ? '再次遠征' : '開始遠征'}</button>
          </section>
          <section className="rpg-panel" aria-labelledby="rpg-upgrades">
            <h2 id="rpg-upgrades">村莊養成</h2>
            <p>見聞 {game.profile.insight} · 勝利 {game.profile.victories} · 已出發 {game.profile.expeditions} 次</p>
            <p>永久發現 {game.profile.discoveries.length} / {DISCOVERY_IDS.length} · 已解鎖養成 {game.profile.upgrades.length} / {Object.keys(UPGRADES).length}</p>
            <p>首次抵達重要地點會帶回見聞；每次勝利再獲得 2。養成在下一趟生效，部分會解鎖新的故事路線。</p>
            <div className="rpg-choices">{Object.entries(UPGRADES).map(([id, upgrade]) => {
              const owned = game.profile.upgrades.includes(id);
              return <button key={id} type="button" disabled={owned || game.profile.insight < upgrade.cost} onClick={() => send({ type: 'upgrade', id })}>
                <strong>{upgrade.name} · {owned ? '已解鎖' : `${upgrade.cost} 見聞`}</strong>
                <span>{upgrade.description}</span>
              </button>;
            })}</div>
          </section>
        </>}
      </>}
      <footer className="rpg-footer">
        <details><summary>原典與改編說明</summary>
          <p>{SOURCE.notice}</p>
          <p><a href={SOURCE.url} target="_blank" rel="noreferrer">{SOURCE.title}（英文原典，開啟需網路）</a></p>
          <p>目前是第二輪事件與掉落擴寫版，尚未宣稱有三小時內容。文字與像素圖已隨程式保存。</p>
        </details>
      </footer>
    </main>
  );
}
