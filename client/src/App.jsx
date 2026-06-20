import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import LeaderboardPage from './pages/LeaderboardPage'


function App() {
  const token = localStorage.getItem('token')

  return (
    <Routes>
      <Route path="/" element={token ? <Navigate to="/home" /> : <LoginPage />} />
      <Route path="/home" element={token ? <HomePage /> : <Navigate to="/" />} />
      <Route path="/game" element={token ? <GamePage /> : <Navigate to="/" />} />
      <Route path="/leaderboard" element={token ? <LeaderboardPage /> : <Navigate to="/" />} />
    </Routes>
  )
}

export default App
