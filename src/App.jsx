import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import { useSettings } from './lib/settings';

export default function App() {
  const location = useLocation();
  const [settings, toggleSetting] = useSettings();

  return (
    <div className="sd-shell">
      <Routes location={location}>
        <Route path="/" element={<Home settings={settings} toggleSetting={toggleSetting} />} />
        {/* key 讓換難度時整局重來,而不是沿用上一題的狀態 */}
        <Route
          path="/play/:level"
          element={<Game key={location.pathname} settings={settings} />}
        />
        <Route path="/daily" element={<Game key="daily" daily settings={settings} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
