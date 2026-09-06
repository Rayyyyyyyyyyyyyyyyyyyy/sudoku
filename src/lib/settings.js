import { useCallback, useEffect, useState } from 'react';

const KEY = 'sudoku-drill-settings-v1';

/** 原本是 artifact 的可調參數,SPA 版改成使用者自己在首頁切換。 */
export const DEFAULT_SETTINGS = {
  showErrors: true,
  highlightPeers: true,
  autoCleanNotes: true,
  idiomShowErrors: true
};

export const SETTING_LABELS = {
  showErrors: '標示填錯的格子',
  highlightPeers: 'highlight 同列同行同宮',
  autoCleanNotes: '填數字時自動清註記',
  idiomShowErrors: '成語填字：標示填錯的格子'
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
  } catch (e) {
    /* 讀不到就用預設值 */
  }
  return Object.assign({}, DEFAULT_SETTINGS);
}

export function useSettings() {
  const [settings, setSettings] = useState(read);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings));
    } catch (e) {
      /* 寫不進去不影響遊玩 */
    }
  }, [settings]);

  const toggle = useCallback((key) => {
    setSettings((s) => ({ ...s, [key]: !s[key] }));
  }, []);

  return [settings, toggle];
}
