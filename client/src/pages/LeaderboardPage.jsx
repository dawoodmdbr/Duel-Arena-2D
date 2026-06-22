import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {Sounds} from "../game/sound";

function LeaderboardPage() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/leaderboard`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        })
        const json = await res.json()
        if (res.ok) setData(json)
        else setError(json.error)
      } catch (err) {
        setError('Failed to fetch leaderboard')
      } finally {
        setLoading(false)
      }
    }

    fetchLeaderboard()
  }, [])

  return (
    <div className="leaderboard-page">
      <div className="top-bar">
        <span>Leaderboard</span>
        <button onClick={() => {Sounds.click();navigate('/home');}}>Back</button>
      </div>

      <div className="leaderboard-content">
        <h2>Global Rankings</h2>
        <p className="leaderboard-subtitle">Ranked by wins → kills → least deaths</p>

        {loading && <p className="loading">Loading...</p>}
        {error && <p className="error">⚠ {error}</p>}

        {!loading && !error && data.length === 0 && (
          <p className="empty">No matches played yet.</p>
        )}

        {!loading && data.length > 0 && (
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Player</th>
                <th>Wins</th>
                <th>Kills</th>
                <th>Deaths</th>
                <th>K/D</th>
              </tr>
            </thead>
            <tbody>
              {data.map((player, index) => (
                <tr key={player.username} className={index < 3 ? `rank-${index + 1}` : ''}>
                  <td className="rank">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td className="player-name">
                    {player.avatar_url && (
                      <img src={player.avatar_url} alt="" className="avatar" />
                    )}
                    {player.username}
                  </td>
                  <td>{player.wins}</td>
                  <td>{player.kills}</td>
                  <td>{player.deaths}</td>
                  <td>
                    {player.deaths === 0
                      ? player.kills
                      : (player.kills / player.deaths).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default LeaderboardPage