import { SETTING_LABELS } from '../lib/settings';

export default function SettingsList({ settingKeys, settings, toggleSetting }) {
  return (
    <div className="game-settings">
      {settingKeys.map((key) => (
        <button
          key={key}
          type="button"
          className="game-setting"
          aria-pressed={settings[key]}
          onClick={() => toggleSetting(key)}
        >
          <span>{SETTING_LABELS[key]}</span>
          <span className={`game-setting__state${settings[key] ? ' game-setting__state--on' : ''}`}>
            {settings[key] ? 'ON' : 'OFF'}
          </span>
        </button>
      ))}
    </div>
  );
}
