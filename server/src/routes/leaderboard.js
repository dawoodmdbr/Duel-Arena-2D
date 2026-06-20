const express = require('express')
const prisma = require('../db')
const authMiddleware = require('../middleware/auth')

const router = express.Router()

router.get('/', authMiddleware, async (req, res) => {
  try {
    const stats = await prisma.stat.findMany({
      include: {
        user: { select: { username: true, avatar_url: true } }
      }
    })

    // Aggregate per user manually
    const userMap = {}
    stats.forEach(stat => {
      if (!userMap[stat.user_id]) {
        userMap[stat.user_id] = {
          username: stat.user.username,
          avatar_url: stat.user.avatar_url,
          wins: 0,
          kills: 0,
          deaths: 0
        }
      }
      userMap[stat.user_id].wins   += stat.won ? 1 : 0
      userMap[stat.user_id].kills  += stat.kills
      userMap[stat.user_id].deaths += stat.deaths
    })

    const result = Object.values(userMap).sort((a, b) => {
      if (b.wins !== a.wins)   return b.wins - a.wins
      if (b.kills !== a.kills) return b.kills - a.kills
      return a.deaths - b.deaths
    })

    res.json(result)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

module.exports = router