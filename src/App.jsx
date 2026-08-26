import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Game from './pages/Game';
import GameHub from './pages/GameHub';
import PokerHome from './pages/PokerHome';
import PokerGame from './pages/PokerGame';
import { useSettings } from './lib/settings';

export default function App() {
  const location = useLocation();
  const [settings, toggleSetting] = useSettings();

  return (
    <div className="sd-shell">
      <Routes location={location}>
        <Route path="/" element={<GameHub />} />
        <Route path="/sudoku" element={<Home settings={settings} toggleSetting={toggleSetting} />} />
        {/* key 讓換難度時整局重來,而不是沿用上一題的狀態 */}
        <Route
          path="/play/:level"
          element={<Game key={`${location.pathname}${location.search}`} settings={settings} />}
        />
        <Route path="/daily" element={<Game key="daily" daily settings={settings} />} />
        <Route path="/poker" element={<PokerHome />} />
        <Route path="/poker/play" element={<PokerGame />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
